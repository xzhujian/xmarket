<template>
  <div class="input-wrapper">
    <label v-if="label" class="input-label" :style="{ color: 'var(--text-color)' }">{{ label }}</label>
    <div class="input-container" :class="{ 'has-error': error }">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input-field"
        :style="{
          color: disabled ? 'var(--disabled-color)' : 'var(--text-color)',
          background: 'var(--search-bg-color)',
          borderColor: error ? '#ef4444' : 'var(--line-color)',
        }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" class="input-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  border: 1px solid;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-field:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.input-field::placeholder {
  color: var(--disabled-color);
}

.input-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
</style>
