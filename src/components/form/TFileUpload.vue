<template>
  <div class="tup-wrap">
    <label v-if="label" class="tup-label">{{ label }}</label>
    <div
      class="tup-area"
      :class="{ 'has-file': !!modelValue, disabled, error: !!error, 'drag-over': dragOver }"
      :style="{
        borderColor: error ? '#ef4444' : dragOver ? 'var(--accent-color)' : 'var(--line-color)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }"
      @click="triggerClick"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :disabled="disabled"
        class="tup-input"
        @change="onFileChange"
      />

      <!-- 文件已选 -->
      <div v-if="modelValue" class="tup-file-info">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" :style="{ color: 'var(--accent-color)' }">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
        <div class="tup-file-detail">
          <span class="tup-file-name">{{ modelValue.name }}</span>
          <span class="tup-file-size">{{ formatSize(modelValue.size) }}</span>
        </div>
        <button
          type="button"
          class="tup-remove"
          :disabled="disabled"
          @click.stop="removeFile"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <!-- 未选 -->
      <div v-else class="tup-placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" :style="{ color: 'var(--disabled-color)' }">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="tup-hint">{{ hint }}</p>
      </div>
    </div>
    <p v-if="error" class="tup-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: File | null
  label?: string
  hint?: string
  accept?: string
  disabled?: boolean
  error?: string
}>(), {
  modelValue: null,
  hint: '点击或拖拽文件到此处',
  accept: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: File | null]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function triggerClick() {
  if (!props.disabled) {
    fileInput.value?.click()
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('update:modelValue', file)
  }
}

function onDragOver() {
  if (!props.disabled) dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    emit('update:modelValue', file)
  }
}

function removeFile() {
  emit('update:modelValue', null)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.tup-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tup-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tup-input {
  display: none;
}

.tup-area {
  border: 2px dashed;
  border-radius: 10px;
  padding: 24px 16px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}

.tup-area.drag-over {
  background: rgba(var(--accent-rgb), 0.05);
}

.tup-area.disabled {
  opacity: 0.5;
}

.tup-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tup-hint {
  font-size: 13px;
  color: var(--disabled-color);
  margin: 0;
}

.tup-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.tup-file-detail {
  flex: 1;
  min-width: 0;
}

.tup-file-name {
  display: block;
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tup-file-size {
  display: block;
  font-size: 12px;
  color: var(--disabled-color);
  margin-top: 2px;
}

.tup-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  color: var(--disabled-color);
  background: transparent;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.tup-remove:hover:not(:disabled) {
  background: var(--bg-hover-muted);
  color: #ef4444;
}

.tup-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
</style>
