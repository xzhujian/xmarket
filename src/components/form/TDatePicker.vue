<template>
  <div class="tdp-wrap">
    <label v-if="label" class="tdp-label">{{ label }}</label>
    <div class="tdp-container" ref="containerRef">
      <button
        type="button"
        class="tdp-trigger"
        :disabled="disabled"
        :style="{
          color: disabled ? 'var(--disabled-color)' : 'var(--text-color)',
          background: 'var(--search-bg-color)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }"
        @click="toggle"
      >
        <span>{{ triggerText || placeholder || defaultPlaceholder }}</span>
        <span class="tdp-trigger-right">
          <button
            v-if="hasValue && !disabled"
            type="button"
            class="tdp-clear-btn"
            @click.stop="clearValue"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <span class="tdp-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
              <path d="M3 10h18" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
        </span>
      </button>

      <Transition name="tdp-drop">
        <div v-if="open" class="tdp-panel" :class="{ 'tdp-panel-wide': pickerType === 'datetime' }" :style="{ background: 'var(--bg-setting-item)', borderColor: 'var(--line-color)' }">
          <!-- 导航 -->
          <div v-if="panelView !== 'time'" class="tdp-header">
            <button type="button" class="tdp-nav-btn" @click="navPrev">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M5 1L1 5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="tdp-header-label" @click="goUp">{{ headerLabel }}</button>
            <button type="button" class="tdp-nav-btn" @click="navNext">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M1 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- 十年视图 (year 模式) -->
          <div v-if="panelView === 'decade'" class="tdp-grid-4x3">
            <button
              v-for="y in decadeYears"
              :key="y"
              type="button"
              class="tdp-grid-item"
              :class="{ selected: selectedYear === y && panelView === 'decade' }"
              :style="selectedYear === y && panelView === 'decade' ? { background: 'var(--accent-color)', color: '#fff' } : {}"
              @click="selectDecadeYear(y)"
            >{{ y }}</button>
          </div>

          <!-- 月份视图 (month 模式 / date 模式的上级) -->
          <div v-if="panelView === 'year'" class="tdp-grid-4x3">
            <button
              v-for="m in monthNames"
              :key="m.value"
              type="button"
              class="tdp-grid-item"
              :class="{ selected: selectedMonth === m.value && panelView === 'year' }"
              :style="selectedMonth === m.value && panelView === 'year' ? { background: 'var(--accent-color)', color: '#fff' } : {}"
              @click="selectMonth(m.value)"
            >{{ m.label }}</button>
          </div>

          <!-- 日期/时间主体区：date/datetime 模式显示日历，datetime 并排显示时间 -->
          <div v-if="panelView === 'month'" class="tdp-datetime-body" :class="{ 'has-time': pickerType === 'datetime' }">
            <div class="tdp-date-section">
              <div class="tdp-weekdays">
                <span v-for="d in weekDays" :key="d" class="tdp-weekday">{{ d }}</span>
              </div>
              <div class="tdp-grid-7">
                <button
                  v-for="(d, i) in dayGrid"
                  :key="i"
                  type="button"
                  class="tdp-day"
                  :class="{
                    empty: !d,
                    selected: d && d === selectedDay && month === selectedMonth && year === selectedYear,
                  }"
                  :style="{
                    color: !d ? 'transparent' : (d === selectedDay && month === selectedMonth && year === selectedYear ? 'var(--text-active-color, #fff)' : 'var(--text-color)'),
                    background: d && d === selectedDay && month === selectedMonth && year === selectedYear ? 'var(--accent-color)' : 'transparent',
                  }"
                  :disabled="!d"
                  @click="d && selectDay(d)"
                >{{ d || '' }}</button>
              </div>
            </div>
            <!-- datetime 模式：日历右侧并排时间列 -->
            <div v-if="pickerType === 'datetime'" class="tdp-time-section">
              <div class="tdp-time-cols">
                <div class="tdp-time-col">
                  <div class="tdp-time-label">时</div>
                  <div class="tdp-time-list">
                    <button
                      v-for="h in hours"
                      :key="h"
                      type="button"
                      class="tdp-time-item"
                      :class="{ selected: tempHour === h }"
                      @click="tempHour = h"
                    >{{ String(h).padStart(2, '0') }}</button>
                  </div>
                </div>
                <div class="tdp-time-col">
                  <div class="tdp-time-label">分</div>
                  <div class="tdp-time-list">
                    <button
                      v-for="m in minutes"
                      :key="m"
                      type="button"
                      class="tdp-time-item"
                      :class="{ selected: tempMinute === m }"
                      @click="tempMinute = m"
                    >{{ String(m).padStart(2, '0') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 纯时间模式 (time) -->
          <div v-if="pickerType === 'time'" class="tdp-time-picker">
            <div class="tdp-time-cols">
              <div class="tdp-time-col">
                <div class="tdp-time-label">时</div>
                <div class="tdp-time-list">
                  <button
                    v-for="h in hours"
                    :key="h"
                    type="button"
                    class="tdp-time-item"
                    :class="{ selected: tempHour === h }"
                    @click="tempHour = h"
                  >{{ String(h).padStart(2, '0') }}</button>
                </div>
              </div>
              <div class="tdp-time-col">
                <div class="tdp-time-label">分</div>
                <div class="tdp-time-list">
                  <button
                    v-for="m in minutes"
                    :key="m"
                    type="button"
                    class="tdp-time-item"
                    :class="{ selected: tempMinute === m }"
                    @click="tempMinute = m"
                  >{{ String(m).padStart(2, '0') }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部按钮：只在 time / datetime 模式显示 -->
          <div v-if="pickerType === 'time' || pickerType === 'datetime'" class="tdp-footer">
            <button type="button" class="tdp-btn tdp-btn-clear" @click="clearValue">清除</button>
            <button
              type="button"
              class="tdp-btn tdp-btn-confirm"
              :style="{ background: 'var(--accent-color)', color: '#fff' }"
              @click="confirm"
            >确定</button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

type PickerType = 'date' | 'month' | 'year' | 'datetime' | 'time'
type PanelView = 'decade' | 'year' | 'month' | 'time'

const props = withDefaults(defineProps<{
  modelValue?: string
  type?: PickerType
  label?: string
  placeholder?: string
  disabled?: boolean
  minuteStep?: number
}>(), {
  modelValue: '',
  type: 'date',
  minuteStep: 5,
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
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 / props.minuteStep }, (_, i) => i * props.minuteStep)

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const pickerType = ref(props.type)

// 内部视图状态
const panelView = ref<PanelView>('month')
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth())

// 选中值
const selectedYear = ref<number | null>(null)
const selectedMonth = ref<number | null>(null)
const selectedDay = ref<number | null>(null)
const selectedHour = ref<number | null>(null)
const selectedMinute = ref<number | null>(null)

// 时间选择临时值
const tempHour = ref(12)
const tempMinute = ref(0)

// 从 modelValue 初始化
function parseModelValue(val: string) {
  if (!val) {
    selectedYear.value = null
    selectedMonth.value = null
    selectedDay.value = null
    selectedHour.value = null
    selectedMinute.value = null
    return
  }

  if (pickerType.value === 'year') {
    selectedYear.value = parseInt(val, 10)
  } else if (pickerType.value === 'time') {
    const parts = val.split(':')
    if (parts.length === 2) {
      selectedHour.value = parseInt(parts[0], 10)
      selectedMinute.value = parseInt(parts[1], 10)
    }
  } else if (pickerType.value === 'month') {
    const parts = val.split('-')
    if (parts.length === 2) {
      selectedYear.value = parseInt(parts[0], 10)
      selectedMonth.value = parseInt(parts[1], 10) - 1
    }
  } else if (pickerType.value === 'datetime') {
    const parts = val.split(' ')
    if (parts.length === 2) {
      const dateParts = parts[0].split('-')
      const timeParts = parts[1].split(':')
      if (dateParts.length === 3) {
        selectedYear.value = parseInt(dateParts[0], 10)
        selectedMonth.value = parseInt(dateParts[1], 10) - 1
        selectedDay.value = parseInt(dateParts[2], 10)
      }
      if (timeParts.length === 2) {
        selectedHour.value = parseInt(timeParts[0], 10)
        selectedMinute.value = parseInt(timeParts[1], 10)
      }
    }
  } else {
    // date
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      selectedYear.value = d.getFullYear()
      selectedMonth.value = d.getMonth()
      selectedDay.value = d.getDate()
    }
  }
}

parseModelValue(props.modelValue)

watch(() => props.modelValue, parseModelValue)

// 初始视图
const initView = computed(() => {
  if (pickerType.value === 'year') return 'decade' as PanelView
  if (pickerType.value === 'month') return 'year' as PanelView
  if (pickerType.value === 'time') return 'time' as PanelView
  return 'month' as PanelView
})

// 打开面板时重置视图
function resetView() {
  panelView.value = initView.value
  if (selectedYear.value !== null) {
    year.value = selectedYear.value
  }
  if (selectedMonth.value !== null) {
    month.value = selectedMonth.value
  }
}

// 默认占位文字
const defaultPlaceholder = computed(() => {
  switch (pickerType.value) {
    case 'year': return '选择年份'
    case 'month': return '选择月份'
    case 'time': return '选择时间'
    case 'datetime': return '选择日期时间'
    default: return '选择日期'
  }
})

// 触发按钮文字
const hasValue = computed(() => !!props.modelValue)
const triggerText = computed(() => {
  if (props.modelValue) return props.modelValue
  return ''
})

// 导航标题
const headerLabel = computed(() => {
  if (panelView.value === 'decade') {
    const start = Math.floor(year.value / 10) * 10
    return `${start} - ${start + 9}`
  }
  if (panelView.value === 'year') return `${year.value}年`
  return `${year.value}年${month.value + 1}月`
})

// 十年数组
const decadeYears = computed(() => {
  const start = Math.floor(year.value / 10) * 10
  return Array.from({ length: 10 }, (_, i) => start + i)
})

// 日期网格
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

// 导航
function navPrev() {
  if (panelView.value === 'decade') year.value -= 10
  else if (panelView.value === 'year') year.value -= 1
  else if (panelView.value === 'month') {
    if (month.value === 0) { month.value = 11; year.value-- }
    else { month.value-- }
  }
}

function navNext() {
  if (panelView.value === 'decade') year.value += 10
  else if (panelView.value === 'year') year.value += 1
  else if (panelView.value === 'month') {
    if (month.value === 11) { month.value = 0; year.value++ }
    else { month.value++ }
  }
}

function goUp() {
  if (panelView.value === 'month') {
    panelView.value = 'year'
  } else if (panelView.value === 'year') {
    panelView.value = 'decade'
  }
}

// 选择
function selectDecadeYear(y: number) {
  if (pickerType.value === 'year') {
    selectedYear.value = y
    confirm()
  } else {
    year.value = y
    panelView.value = 'year'
  }
}

function selectMonth(m: number) {
  selectedMonth.value = m
  if (pickerType.value === 'month') {
    selectedYear.value = year.value
    confirm()
  } else {
    month.value = m
    panelView.value = 'month'
  }
}

function selectDay(d: number) {
  selectedDay.value = d
  selectedYear.value = year.value
  selectedMonth.value = month.value
  if (pickerType.value === 'datetime') {
    tempHour.value = selectedHour.value ?? 12
    tempMinute.value = selectedMinute.value ?? 0
  } else {
    confirm()
  }
}

// 确认
function confirm() {
  if (pickerType.value === 'year') {
    if (selectedYear.value !== null) {
      emit('update:modelValue', String(selectedYear.value))
      open.value = false
    }
  } else if (pickerType.value === 'time') {
    selectedHour.value = tempHour.value
    selectedMinute.value = tempMinute.value
    const time = `${String(selectedHour.value).padStart(2, '0')}:${String(selectedMinute.value).padStart(2, '0')}`
    emit('update:modelValue', time)
    open.value = false
  } else if (pickerType.value === 'month') {
    if (selectedYear.value !== null && selectedMonth.value !== null) {
      emit('update:modelValue', `${selectedYear.value}-${String(selectedMonth.value + 1).padStart(2, '0')}`)
      open.value = false
    }
  } else if (pickerType.value === 'datetime') {
    if (selectedYear.value !== null && selectedMonth.value !== null && selectedDay.value !== null) {
      selectedHour.value = tempHour.value
      selectedMinute.value = tempMinute.value
      const date = `${selectedYear.value}-${String(selectedMonth.value + 1).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
      const time = `${String(selectedHour.value).padStart(2, '0')}:${String(selectedMinute.value).padStart(2, '0')}`
      emit('update:modelValue', `${date} ${time}`)
      open.value = false
    }
  } else {
    if (selectedYear.value !== null && selectedMonth.value !== null && selectedDay.value !== null) {
      const formatted = `${selectedYear.value}-${String(selectedMonth.value + 1).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
      emit('update:modelValue', formatted)
      open.value = false
    }
  }
}

function clearValue() {
  selectedYear.value = null
  selectedMonth.value = null
  selectedDay.value = null
  selectedHour.value = null
  selectedMinute.value = null
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
.tdp-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tdp-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tdp-container {
  position: relative;
}

/* 触发器 */
.tdp-trigger {
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

.tdp-trigger:active {
  transform: none;
}

.tdp-trigger:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tdp-trigger-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.tdp-icon {
  display: flex;
  align-items: center;
  color: var(--disabled-color);
}

.tdp-clear-btn {
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

.tdp-clear-btn:hover {
  color: var(--text-color);
  background: var(--bg-hover-muted);
}

/* 面板 */
.tdp-panel {
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

.tdp-panel-wide {
  width: 420px;
}

/* 导航 */
.tdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tdp-header-label {
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

.tdp-header-label:hover {
  background: var(--bg-hover-muted);
}

.tdp-nav-btn {
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

.tdp-nav-btn:hover {
  background: var(--bg-hover-muted);
}

/* 4x3 网格 (年/月) */
.tdp-grid-4x3 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.tdp-grid-item {
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

.tdp-grid-item:hover {
  background: var(--bg-left-menu-hover);
}

/* 日期+时间主体区 (datetime 并排) */
.tdp-datetime-body {
  display: flex;
  gap: 16px;
}

.tdp-datetime-body.has-time {
  /* 日历部分窄一点，给时间列留空间 */
}

.tdp-date-section {
  flex: 0 0 auto;
}

.tdp-time-section {
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--line-color);
  padding-left: 12px;
}

.tdp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.tdp-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--disabled-color);
  padding: 4px 0;
}

.tdp-grid-7 {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.tdp-day {
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

.tdp-day:hover:not(.empty) {
  background: var(--bg-left-menu-hover);
}

/* 时间选择 */
.tdp-time-picker {
  margin-top: 0;
}

.tdp-time-cols {
  display: flex;
  gap: 8px;
}

.tdp-time-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tdp-time-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--disabled-color);
  margin-bottom: 8px;
}

.tdp-time-list {
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-behavior: smooth;
}

.tdp-time-list::-webkit-scrollbar {
  width: 4px;
}

.tdp-time-list::-webkit-scrollbar-thumb {
  background: var(--line-color);
  border-radius: 2px;
}

.tdp-time-item {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s, color 0.15s, transform 0.1s;
  color: var(--text-color);
  background: transparent;
}

.tdp-time-item:hover {
  background: var(--bg-left-menu-hover);
}

.tdp-time-item.selected {
  background: var(--accent-color);
  color: var(--text-active-color, #fff);
  font-weight: 700;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3);
}

/* 底部按钮 */
.tdp-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--line-color);
}

.tdp-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.tdp-btn:hover {
  opacity: 0.85;
}

.tdp-btn-clear {
  background: transparent;
  color: var(--disabled-color);
}

.tdp-btn-confirm {
  font-weight: 500;
}

/* 动画 */
.tdp-drop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tdp-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tdp-drop-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.tdp-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
