<template>
  <label class="tcb-wrap">
    <span class="tcb-visual" :class="{ checked: modelValue, disabled }">
      <svg v-if="modelValue" class="tcb-check" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="tcb-native"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label" class="tcb-label" :class="{ disabled }">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.tcb-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  cursor: pointer;
}

.tcb-wrap:has(.tcb-native:disabled) {
  cursor: not-allowed;
}

.tcb-native {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.tcb-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--line-color);
  border-radius: 4px;
  background: transparent;
  transition: all 0.2s;
  flex-shrink: 0;
}

.tcb-visual.checked {
  border-color: var(--accent-color);
  background: var(--accent-color);
}

.tcb-visual.disabled {
  opacity: 0.5;
}

.tcb-check {
  width: 10px;
  height: 10px;
}

.tcb-label {
  font-size: 14px;
  color: var(--text-color);
}

.tcb-label.disabled {
  color: var(--disabled-color);
}
</style>
