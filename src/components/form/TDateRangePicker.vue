<template>
  <div class="tdrp-wrap">
    <label v-if="label" class="tdrp-label">{{ label }}</label>
    <div class="tdrp-container" ref="containerRef">
      <button
        type="button"
        class="tdrp-trigger"
        :disabled="disabled"
        :style="{
          color: disabled ? 'var(--disabled-color)' : 'var(--text-color)',
          background: 'var(--search-bg-color)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }"
        @click="toggle"
      >
        <span>{{ triggerText || placeholder || defaultPlaceholder }}</span>
        <span class="tdrp-trigger-right">
          <button
            v-if="hasValue && !disabled"
            type="button"
            class="tdrp-clear-btn"
            @click.stop="clearValue"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <span class="tdrp-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
              <path d="M3 10h18" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
        </span>
      </button>

      <Transition name="tdrp-drop">
        <div v-if="open" class="tdrp-panel" :style="{ background: 'var(--bg-setting-item)', borderColor: 'var(--line-color)' }">
          <!-- 导航 -->
          <div class="tdrp-header">
            <button type="button" class="tdrp-nav-btn" @click="navPrev">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M5 1L1 5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="tdrp-header-label" @click="goUp">{{ headerLabel }}</button>
            <button type="button" class="tdrp-nav-btn" @click="navNext">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M1 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- 选择提示 -->
          <div class="tdrp-step-hint" :style="{ color: 'var(--disabled-color)' }">{{ stepLabel }}</div>

          <!-- 十年视图 (year 模式) -->
          <div v-if="panelView === 'decade'" class="tdrp-grid-4x3">
            <button
              v-for="y in decadeYears"
              :key="y"
              type="button"
              class="tdrp-grid-item"
              :class="{
                'range-start': rangeStart && rangeStart.y === y && rangeStart.m === -1,
                'range-end': rangeEnd && rangeEnd.y === y && rangeEnd.m === -1,
                'in-range': isYearInRange(y),
              }"
              :style="getItemStyle(!!(rangeStart && rangeStart.y === y && rangeStart.m === -1), !!(rangeEnd && rangeEnd.y === y && rangeEnd.m === -1))"
            >{{ y }}</button>
          </div>

          <!-- 月份视图 (month 模式) -->
          <div v-if="panelView === 'year'" class="tdrp-grid-4x3">
            <button
              v-for="m in monthNames"
              :key="m.value"
              type="button"
              class="tdrp-grid-item"
              :class="{
                'range-start': rangeStart && rangeStart.y === year && rangeStart.m === m.value,
                'range-end': rangeEnd && rangeEnd.y === year && rangeEnd.m === m.value,
                'in-range': isMonthInRange(m.value),
              }"
              :style="getItemStyle(!!(rangeStart && rangeStart.y === year && rangeStart.m === m.value), !!(rangeEnd && rangeEnd.y === year && rangeEnd.m === m.value))"
              @click="selectMonth(m.value)"
            >{{ m.label }}</button>
          </div>

          <!-- 日期视图 (date 模式) -->
          <div v-if="panelView === 'month'" class="tdrp-date-view">
            <div class="tdrp-weekdays">
              <span v-for="d in weekDays" :key="d" class="tdrp-weekday">{{ d }}</span>
            </div>
            <div class="tdrp-grid-7">
              <button
                v-for="(d, i) in dayGrid"
                :key="i"
                type="button"
                class="tdrp-day"
                :class="{
                  empty: !d,
                  'range-start': d && isDayMatch(rangeStart, d),
                  'range-end': d && isDayMatch(rangeEnd, d),
                  'in-range': d !== null && isDayInRange(d),
                }"
                :style="{
                  color: !d ? 'transparent' : 'var(--text-color)',
                  ...(d && isDayMatch(rangeStart, d) ? { background: 'var(--accent-color)', color: 'var(--text-active-color, #fff)' } : {}),
                  ...(d && isDayMatch(rangeEnd, d) ? { background: 'var(--accent-color)', color: 'var(--text-active-color, #fff)' } : {}),
                }"
                :disabled="!d"
                @click="d && selectDay(d)"
              >{{ d || '' }}</button>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="tdrp-footer">
            <button type="button" class="tdrp-btn tdrp-btn-clear" @click="clearValue">清除</button>
            <button
              type="button"
              class="tdrp-btn tdrp-btn-confirm"
              :style="{ background: 'var(--accent-color)', color: '#fff' }"
              @click="confirmRange"
            >确定</button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

type PickerType = 'date' | 'month' | 'year'
type PanelView = 'decade' | 'year' | 'month'

interface Point { y: number; m: number; d: number }

const props = withDefaults(defineProps<{
  modelValue?: string
  type?: PickerType
  label?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  type: 'date',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const monthNames = [
  { value: 0, label: '一月' }, { value: 1, label: '二月' }, { value: 2, label: '三月' }, { value: 3, label: '四月' },
  { value: 4, label: '五月' }, { value: 5, label: '六月' }, { value: 6, label: '七月' }, { value: 7, label: '八月' },
  { value: 8, label: '九月' }, { value: 9, label: '十月' }, { value: 10, label: '十一月' }, { value: 11, label: '十二月' },
]

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const pickerType = ref(props.type)

const panelView = ref<PanelView>('month')
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth())

// 范围选择状态
const selectingStep = ref<'start' | 'end'>('start')
const rangeStart = ref<Point | null>(null)
const rangeEnd = ref<Point | null>(null)
const confirmedStart = ref<Point | null>(null)
const confirmedEnd = ref<Point | null>(null)

// 从 modelValue 初始化
function parseModelValue(val: string) {
  if (!val) {
    confirmedStart.value = null
    confirmedEnd.value = null
    return
  }
  const parts = val.split('~')
  if (parts.length !== 2) return

  if (pickerType.value === 'year') {
    const y1 = parseInt(parts[0], 10)
    const y2 = parseInt(parts[1], 10)
    if (!isNaN(y1) && !isNaN(y2)) {
      confirmedStart.value = { y: y1, m: -1, d: -1 }
      confirmedEnd.value = { y: y2, m: -1, d: -1 }
    }
  } else if (pickerType.value === 'month') {
    const p1 = parts[0].split('-')
    const p2 = parts[1].split('-')
    if (p1.length === 2 && p2.length === 2) {
      const y1 = parseInt(p1[0]), m1 = parseInt(p1[1]) - 1
      const y2 = parseInt(p2[0]), m2 = parseInt(p2[1]) - 1
      if (!isNaN(y1) && !isNaN(m1) && !isNaN(y2) && !isNaN(m2)) {
        confirmedStart.value = { y: y1, m: m1, d: -1 }
        confirmedEnd.value = { y: y2, m: m2, d: -1 }
      }
    }
  } else {
    const d1 = new Date(parts[0])
    const d2 = new Date(parts[1])
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      confirmedStart.value = { y: d1.getFullYear(), m: d1.getMonth(), d: d1.getDate() }
      confirmedEnd.value = { y: d2.getFullYear(), m: d2.getMonth(), d: d2.getDate() }
    }
  }
}

parseModelValue(props.modelValue)
watch(() => props.modelValue, parseModelValue)

const initView = computed(() => {
  if (pickerType.value === 'year') return 'decade' as PanelView
  if (pickerType.value === 'month') return 'year' as PanelView
  return 'month' as PanelView
})

function resetView() {
  panelView.value = initView.value
  rangeStart.value = confirmedStart.value ? { ...confirmedStart.value } : null
  rangeEnd.value = confirmedEnd.value ? { ...confirmedEnd.value } : null
  selectingStep.value = 'start'
  if (confirmedStart.value) year.value = confirmedStart.value.y
  if (confirmedStart.value && 'm' in confirmedStart.value && confirmedStart.value.m >= 0) month.value = confirmedStart.value.m
}

const defaultPlaceholder = computed(() => {
  switch (pickerType.value) {
    case 'year': return '选择年份范围'
    case 'month': return '选择月份范围'
    default: return '选择日期范围'
  }
})

const hasValue = computed(() => !!props.modelValue)
const triggerText = computed(() => {
  if (props.modelValue) return props.modelValue
  return ''
})

const stepLabel = computed(() => {
  if (!rangeStart.value) return '请选择开始'
  if (!rangeEnd.value) return '请选择结束'
  return '已选择范围，点击确定确认'
})

const headerLabel = computed(() => {
  if (panelView.value === 'decade') {
    const start = Math.floor(year.value / 10) * 10
    return `${start} - ${start + 9}`
  }
  if (panelView.value === 'year') return `${year.value}年`
  return `${year.value}年${month.value + 1}月`
})

const decadeYears = computed(() => {
  const start = Math.floor(year.value / 10) * 10
  return Array.from({ length: 10 }, (_, i) => start + i)
})

const dayGrid = computed(() => {
  const firstDay = new Date(year.value, month.value, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const grid: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
})

function key(p: Point): number {
  return p.y * 10000 + (p.m + 1) * 100 + p.d
}

function navPrev() {
  if (panelView.value === 'decade') year.value -= 10
  else if (panelView.value === 'year') year.value -= 1
  else {
    if (month.value === 0) { month.value = 11; year.value-- }
    else { month.value-- }
  }
}

function navNext() {
  if (panelView.value === 'decade') year.value += 10
  else if (panelView.value === 'year') year.value += 1
  else {
    if (month.value === 11) { month.value = 0; year.value++ }
    else { month.value++ }
  }
}

function goUp() {
  if (panelView.value === 'month') panelView.value = 'year'
  else if (panelView.value === 'year') panelView.value = 'decade'
}

function selectDecadeYear(y: number) {
  if (pickerType.value === 'year') {
    if (selectingStep.value === 'start' || !rangeStart.value) {
      rangeStart.value = { y, m: -1, d: -1 }
      rangeEnd.value = null
      selectingStep.value = 'end'
    } else {
      rangeEnd.value = { y, m: -1, d: -1 }
    }
  } else {
    year.value = y
    panelView.value = 'year'
  }
}

function selectMonth(m: number) {
  if (pickerType.value === 'month') {
    if (selectingStep.value === 'start' || !rangeStart.value) {
      rangeStart.value = { y: year.value, m, d: -1 }
      rangeEnd.value = null
      selectingStep.value = 'end'
    } else {
      rangeEnd.value = { y: year.value, m, d: -1 }
    }
  } else {
    month.value = m
    panelView.value = 'month'
  }
}

function selectDay(d: number) {
  if (selectingStep.value === 'start' || !rangeStart.value) {
    rangeStart.value = { y: year.value, m: month.value, d }
    rangeEnd.value = null
    selectingStep.value = 'end'
  } else {
    rangeEnd.value = { y: year.value, m: month.value, d }
  }
}

function isYearInRange(y: number): boolean {
  if (!rangeStart.value || !rangeEnd.value) return false
  const s = rangeStart.value.y
  const e = rangeEnd.value.y
  const min = Math.min(s, e)
  const max = Math.max(s, e)
  return y > min && y < max
}

function isMonthInRange(m: number): boolean {
  if (!rangeStart.value || !rangeEnd.value) return false
  const s = key(rangeStart.value)
  const e = key(rangeEnd.value)
  const cur = year.value * 10000 + (m + 1) * 100
  const min = Math.min(s, e)
  const max = Math.max(s, e)
  return cur > min && cur < max
}

function isDayInRange(d: number): boolean {
  if (!rangeStart.value || !rangeEnd.value) return false
  const s = key(rangeStart.value)
  const e = key(rangeEnd.value)
  const cur = year.value * 10000 + (month.value + 1) * 100 + d
  const min = Math.min(s, e)
  const max = Math.max(s, e)
  return cur > min && cur < max
}

function isDayMatch(p: Point | null, d: number): boolean {
  if (!p) return false
  return p.y === year.value && p.m === month.value && p.d === d
}

function getItemStyle(isStart: boolean, isEnd: boolean) {
  if (isStart || isEnd) {
    return { background: 'var(--accent-color)', color: '#fff' }
  }
  return {}
}

function confirmRange() {
  if (!rangeStart.value || !rangeEnd.value) return
  const s = rangeStart.value
  const e = rangeEnd.value
  const sv = s.y * 10000 + (s.m + 1) * 100 + s.d
  const ev = e.y * 10000 + (e.m + 1) * 100 + e.d
  let start: Point, end: Point
  if (sv <= ev) { start = s; end = e }
  else { start = e; end = s }

  confirmedStart.value = start
  confirmedEnd.value = end

  if (pickerType.value === 'year') {
    emit('update:modelValue', `${start.y}~${end.y}`)
  } else if (pickerType.value === 'month') {
    const s = `${start.y}-${String(start.m + 1).padStart(2, '0')}`
    const e = `${end.y}-${String(end.m + 1).padStart(2, '0')}`
    emit('update:modelValue', `${s}~${e}`)
  } else {
    const s = `${start.y}-${String(start.m + 1).padStart(2, '0')}-${String(start.d).padStart(2, '0')}`
    const e = `${end.y}-${String(end.m + 1).padStart(2, '0')}-${String(end.d).padStart(2, '0')}`
    emit('update:modelValue', `${s}~${e}`)
  }
  open.value = false
}

function clearValue() {
  rangeStart.value = null
  rangeEnd.value = null
  confirmedStart.value = null
  confirmedEnd.value = null
  emit('update:modelValue', '')
  open.value = false
}

function toggle() {
  if (!props.disabled) {
    open.value = !open.value
    if (open.value) resetView()
  }
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.tdrp-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tdrp-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tdrp-container {
  position: relative;
}

.tdrp-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid var(--line-color);
  outline: none;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tdrp-trigger:active {
  transform: none;
}

.tdrp-trigger:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tdrp-trigger-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.tdrp-icon {
  display: flex;
  align-items: center;
  color: var(--disabled-color);
}

.tdrp-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  color: var(--disabled-color);
  background: transparent;
  padding: 0;
  transition: color 0.15s, background 0.15s;
}

.tdrp-clear-btn:hover {
  color: var(--text-color);
  background: var(--bg-hover-muted);
}

.tdrp-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 280px;
  border: 1px solid;
  border-radius: 10px;
  padding: 12px;
  z-index: 50;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.tdrp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tdrp-header-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.tdrp-header-label:hover {
  background: var(--bg-hover-muted);
}

.tdrp-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  color: var(--text-color);
  background: transparent;
  transition: background 0.15s;
}

.tdrp-nav-btn:hover {
  background: var(--bg-hover-muted);
}

.tdrp-step-hint {
  font-size: 11px;
  text-align: center;
  margin-bottom: 8px;
}

.tdrp-grid-4x3 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.tdrp-grid-item {
  padding: 8px 0;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: var(--text-color);
  background: transparent;
  transition: background 0.12s, color 0.12s;
}

.tdrp-grid-item:hover {
  background: var(--bg-left-menu-hover);
}

.tdrp-grid-item.in-range {
  background: rgba(var(--accent-rgb), 0.12);
  border-radius: 0;
}

.tdrp-date-view {
  display: flex;
  flex-direction: column;
}

.tdrp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.tdrp-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--disabled-color);
  padding: 4px 0;
}

.tdrp-grid-7 {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.tdrp-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 32px;
  border-radius: 6px;
  font-size: 13px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tdrp-day:hover:not(.empty) {
  background: var(--bg-left-menu-hover);
}

.tdrp-day.in-range {
  background: rgba(var(--accent-rgb), 0.12);
  border-radius: 0;
}

.tdrp-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--line-color);
}

.tdrp-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.tdrp-btn:hover {
  opacity: 0.85;
}

.tdrp-btn-clear {
  background: transparent;
  color: var(--disabled-color);
}

.tdrp-btn-confirm {
  font-weight: 500;
}

.tdrp-drop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tdrp-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tdrp-drop-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.tdrp-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
