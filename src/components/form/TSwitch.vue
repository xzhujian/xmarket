<template>
  <label class="switch-wrapper" :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }">
    <span class="switch-track" :class="{ checked: modelValue, disabled }" :style="{ background: modelValue ? 'var(--accent-color)' : 'var(--line-color)' }">
      <span class="switch-thumb" :class="{ checked: modelValue }" />
    </span>
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="switch-native"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label" class="switch-label" :style="{ color: disabled ? 'var(--disabled-color)' : 'var(--text-color)' }">{{ label }}</span>
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
.switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.switch-native {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.switch-track.disabled {
  opacity: 0.5;
}

.switch-thumb {
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

.switch-thumb.checked {
  transform: translateX(18px);
}

.switch-label {
  font-size: 14px;
}
</style>
