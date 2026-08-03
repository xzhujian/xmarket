<template>
  <div class="tn-wrap">
    <label v-if="label" class="tn-label">{{ label }}</label>
    <div class="tn-field-wrap" :class="{ error: !!error }">
      <button
        type="button"
        class="tn-btn tn-btn-minus"
        :disabled="disabled || computedVal <= min"
        @click="stepDown"
      >
        <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
          <path d="M1 1h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <input
        type="number"
        :value="computedVal"
        :disabled="disabled"
        :min="min"
        :max="max"
        class="tn-field"
        :class="{ disabled }"
        @input="onInput"
      />
      <button
        type="button"
        class="tn-btn tn-btn-plus"
        :disabled="disabled || computedVal >= max"
        @click="stepUp"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    <p v-if="error" class="tn-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  error?: string
}>(), {
  min: -Infinity,
  max: Infinity,
  step: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const computedVal = computed(() => props.modelValue)

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return
  let val = parseFloat(raw)
  if (isNaN(val)) return
  if (val < props.min) val = props.min
  if (val > props.max) val = props.max
  emit('update:modelValue', val)
}

function stepDown() {
  const val = Math.max(props.min, computedVal.value - props.step)
  emit('update:modelValue', val)
}

function stepUp() {
  const val = Math.min(props.max, computedVal.value + props.step)
  emit('update:modelValue', val)
}
</script>

<style scoped>
.tn-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tn-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tn-field-wrap {
  display: flex;
  align-items: center;
  border: 1px solid var(--line-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--search-bg-color);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tn-field-wrap:focus-within {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tn-field-wrap.error {
  border-color: #ef4444;
}

.tn-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  cursor: pointer;
  color: var(--text-color);
  background: transparent;
  flex-shrink: 0;
  transition: background 0.15s;
}

.tn-btn:hover:not(:disabled) {
  background: var(--bg-hover-muted);
}

.tn-btn:disabled {
  color: var(--disabled-color);
  cursor: not-allowed;
}

.tn-field {
  width: 100%;
  padding: 8px 4px;
  font-size: 14px;
  font-family: inherit;
  text-align: center;
  outline: none;
  border: none;
  border-left: 1px solid var(--line-color);
  border-right: 1px solid var(--line-color);
  color: var(--text-color);
  background: transparent;
  -moz-appearance: textfield;
}

.tn-field::-webkit-outer-spin-button,
.tn-field::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.tn-field.disabled {
  color: var(--disabled-color);
}

.tn-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
</style>
