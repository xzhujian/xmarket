<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" :class="{ 'overlay-close': closeOnOverlay }" @click.self="onOverlayClick">
        <div class="modal-panel" :class="[size, { 'no-pad': noPadding }]" :style="{ background: 'var(--bg-setting-item)' }">
          <!-- 头部 -->
          <div v-if="title || closable" class="modal-header">
            <h3 class="modal-title" :style="{ color: 'var(--text-color)' }">{{ title }}</h3>
            <button v-if="closable" class="modal-close" @click="close" :title="$t('common.cancel')">
              <SvgIcon name="close" :size="18" />
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body" :class="{ 'no-header': !title && !closable }">
            <slot />
          </div>

          <!-- 底部按钮 -->
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
  closeOnOverlay?: boolean
  noPadding?: boolean
}>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  noPadding: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function onOverlayClick() {
  if (props.closeOnOverlay) close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.modal-panel {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  max-height: 85vh;
  overflow: hidden;
}

.modal-panel.sm {
  width: 400px;
}

.modal-panel.md {
  width: 520px;
}

.modal-panel.lg {
  width: 680px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-color);
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--bg-hover-muted);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  scrollbar-gutter: stable;
}

.modal-body.no-header {
  padding-top: 24px;
}

.modal-panel.no-pad .modal-body {
  padding: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--line-color);
  flex-shrink: 0;
}

/* 动画 */
.modal-enter-active {
  transition: opacity 0.2s ease-out;
}
.modal-leave-active {
  transition: opacity 0.15s ease-in;
}
.modal-enter-active .modal-panel {
  transition: transform 0.2s ease-out;
}
.modal-leave-active .modal-panel {
  transition: transform 0.15s ease-in;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal-panel {
  transform: scale(0.95) translateY(10px);
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .modal-panel {
  transform: scale(0.95);
}
</style>
