<template>
  <div class="tta-wrap">
    <label v-if="label" class="tta-label">{{ label }}</label>
    <div class="tta-field-wrap" :class="{ error: !!error }">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        class="tta-field"
        :class="{ disabled }"
        :style="{ minHeight: minHeightPx + 'px', maxHeight: maxHeightPx + 'px' }"
        @input="onInput"
      ></textarea>
    </div>
    <p v-if="error" class="tta-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  rows?: number
  minRows?: number
  maxRows?: number
}>(), {
  rows: 3,
  minRows: 3,
  maxRows: 10,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const LINE_HEIGHT = 21 // 14px * 1.5 line-height
const PADDING_V = 20   // 10px top + 10px bottom

const minHeightPx = computed(() => props.minRows * LINE_HEIGHT + PADDING_V)
const maxHeightPx = computed(() => props.maxRows * LINE_HEIGHT + PADDING_V)

function onInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', val)
  autoResize()
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const h = Math.min(Math.max(el.scrollHeight, minHeightPx.value), maxHeightPx.value)
  el.style.height = h + 'px'
}

onMounted(() => {
  autoResize()
})
</script>

<style scoped>
.tta-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tta-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tta-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  border: 1px solid var(--line-color);
  box-sizing: border-box;
  color: var(--text-color);
  background: var(--search-bg-color);
  resize: none;
  overflow-y: auto;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tta-field:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
}

.tta-field::placeholder {
  color: var(--disabled-color);
}

.tta-field.disabled {
  color: var(--disabled-color);
}

.tta-field-wrap.error .tta-field {
  border-color: #ef4444;
}

.tta-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
</style>
