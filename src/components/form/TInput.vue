<template>
  <div class="tinput-wrap">
    <label v-if="label" class="tinput-label">{{ label }}</label>
    <div class="tinput-field-wrap" :class="{ error: !!error }">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="tinput-field"
        :class="{ disabled }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" class="tinput-error">{{ error }}</p>
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
.tinput-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tinput-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tinput-field-wrap {
  display: flex;
}

.tinput-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  border: 1px solid var(--line-color);
  box-sizing: border-box;
  color: var(--text-color);
  background: var(--search-bg-color);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tinput-field:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tinput-field::placeholder {
  color: var(--disabled-color);
}

.tinput-field.disabled {
  color: var(--disabled-color);
}

.tinput-field-wrap.error .tinput-field {
  border-color: #ef4444;
}

.tinput-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
</style>
