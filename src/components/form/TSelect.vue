<template>
  <div class="tsel-wrapper">
    <label v-if="label" class="tsel-label">{{ label }}</label>
    <div class="tsel-container" ref="containerRef">
      <!-- 触发器按钮 -->
      <button
        type="button"
        class="tsel-trigger"
        :class="{ open, disabled, error: !!error }"
        :disabled="disabled"
        @click="toggle"
      >
        <span>{{ selectedLabel || placeholder || '' }}</span>
        <span class="tsel-arrow" :class="{ open }">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>

      <!-- 自定义下拉面板 -->
      <Transition name="tsel-drop">
        <div v-if="open" class="tsel-panel">
          <button
            v-for="(opt, idx) in options"
            :key="opt.value"
            type="button"
            class="tsel-option"
            :class="{
              selected: modelValue === opt.value,
              'has-border': idx > 0,
            }"
            @click="select(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </Transition>
    </div>
    <p v-if="error" class="tsel-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  options: SelectOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : ''
})

function toggle() {
  if (!props.disabled) open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
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
.tsel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tsel-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tsel-container {
  position: relative;
}

/* ===== 触发器 ===== */
.tsel-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.4;
  font-family: inherit;
  border: 1px solid var(--line-color);
  outline: none;
  text-align: left;
  color: var(--text-color);
  background: var(--search-bg-color);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tsel-trigger:active {
  transform: none;
}

.tsel-trigger:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tsel-trigger.disabled {
  color: var(--disabled-color);
  cursor: not-allowed;
}

.tsel-trigger.error {
  border-color: #ef4444;
}

/* ===== 箭头动画 ===== */
.tsel-arrow {
  display: flex;
  align-items: center;
  transition: transform 0.25s ease;
  flex-shrink: 0;
  margin-left: 8px;
  color: var(--disabled-color);
}

.tsel-arrow.open {
  transform: rotate(180deg);
}

/* ===== 下拉面板 ===== */
.tsel-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  border: 1px solid var(--line-color);
  border-radius: 8px;
  overflow: hidden;
  z-index: 50;
  background: var(--bg-setting-item);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* ===== 选项 ===== */
.tsel-option {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  border: none;
  cursor: pointer;
  color: var(--text-color);
  background: transparent;
  transition: background 0.15s;
}

.tsel-option:active {
  transform: none;
}

.tsel-option.has-border {
  border-top: 1px solid var(--line-color);
}

.tsel-option:hover {
  background: var(--bg-left-menu-hover);
}

.tsel-option.selected {
  color: var(--text-active-color);
  background: var(--bg-active-msg);
}

.tsel-option.selected:hover {
  background: var(--bg-active-msg);
}

/* ===== 错误提示 ===== */
.tsel-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}

/* ===== 下拉动画 ===== */
.tsel-drop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tsel-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tsel-drop-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.tsel-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
