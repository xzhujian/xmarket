<template>
  <div class="trg-wrap">
    <label v-if="label" class="trg-label">{{ label }}</label>
    <div class="trg-options" :class="mode === 'dot' ? 'trg-options-dot' : ''">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="trg-option"
        :class="{
          selected: modelValue === opt.value,
          disabled,
          'trg-option-dot': mode === 'dot',
        }"
        :style="{
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...(mode === 'block' && modelValue === opt.value ? { background: 'var(--bg-active-msg)' } : {}),
        }"
        @click="select(opt.value)"
      >
        <span class="trg-dot" :class="{ checked: modelValue === opt.value, 'trg-dot-dot': mode === 'dot', 'trg-dot-block-checked': mode === 'block' && modelValue === opt.value }">
          <span v-if="modelValue === opt.value" class="trg-dot-inner" :class="{ 'trg-dot-inner-dot': mode === 'dot', 'trg-dot-inner-block': mode === 'block' }" />
        </span>
        <span
          class="trg-text"
          :class="{ 'trg-text-dot': mode === 'dot' }"
          :style="mode === 'block' && modelValue === opt.value ? { color: 'var(--text-active-color)' } : {}"
        >{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RadioOption {
  value: string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  disabled?: boolean
  options: RadioOption[]
  mode?: 'block' | 'dot'
}>(), {
  mode: 'block',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<style scoped>
.trg-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trg-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.trg-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trg-options-dot {
  gap: 2px;
}

.trg-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 0.15s;
  cursor: pointer;
}

.trg-option:hover:not(.disabled) {
  background: var(--bg-left-menu-hover);
}

.trg-option-dot {
  padding: 6px 8px;
  border-radius: 6px;
}

.trg-option-dot:hover:not(.disabled) {
  background: var(--bg-hover-muted);
}

.trg-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line-color);
  flex-shrink: 0;
  transition: border-color 0.2s, background 0.2s;
}

.trg-dot.checked {
  border-color: var(--accent-color);
}

.trg-dot.trg-dot-block-checked {
  border-color: var(--text-active-color);
}

.trg-dot-dot.checked {
  border-color: var(--accent-color);
}

.trg-dot-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-color);
}

.trg-dot-inner.trg-dot-inner-block {
  background: var(--text-active-color);
}

.trg-dot-inner-dot {
  background: var(--accent-color);
}

.trg-text {
  font-size: 14px;
}

.trg-text-dot {
  font-size: 14px;
  color: var(--text-color) !important;
}
</style>
