<template>
  <label class="checkbox-wrapper" :style="{ cursor: disabled ? 'not-allowed' : 'pointer' }">
    <span class="checkbox-visual" :class="{ checked: modelValue, disabled }" :style="{ borderColor: modelValue ? 'var(--accent-color)' : 'var(--line-color)', background: modelValue ? 'var(--accent-color)' : 'transparent' }">
      <svg v-if="modelValue" class="checkbox-check" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="checkbox-native"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label" class="checkbox-label" :style="{ color: disabled ? 'var(--disabled-color)' : 'var(--text-color)' }">{{ label }}</span>
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
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.checkbox-native {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.checkbox-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.checkbox-visual.checked {
  border-color: var(--accent-color);
  background: var(--accent-color);
}

.checkbox-visual.disabled {
  opacity: 0.5;
}

.checkbox-check {
  width: 10px;
  height: 10px;
}

.checkbox-label {
  font-size: 14px;
}
</style>
