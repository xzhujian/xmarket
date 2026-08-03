<template>
  <label class="tsw-wrap">
    <span class="tsw-track" :class="{ checked: modelValue, disabled }">
      <span class="tsw-thumb" :class="{ checked: modelValue }" />
    </span>
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="tsw-native"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label" class="tsw-label" :class="{ disabled }">{{ label }}</span>
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
.tsw-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  user-select: none;
  cursor: pointer;
}

.tsw-wrap:has(.tsw-native:disabled) {
  cursor: not-allowed;
}

.tsw-native {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.tsw-track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--line-color);
  transition: background 0.2s;
  flex-shrink: 0;
}

.tsw-track.checked {
  background: var(--accent-color);
}

.tsw-track.disabled {
  opacity: 0.5;
}

.tsw-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.tsw-thumb.checked {
  transform: translateX(18px);
}

.tsw-label {
  font-size: 14px;
  color: var(--text-color);
}

.tsw-label.disabled {
  color: var(--disabled-color);
}
</style>
