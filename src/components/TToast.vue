<template>
  <Teleport to="body">
    <div class="toast-container" :class="position">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="[t.type]"
          :style="{
            background: t.type === 'success' ? '#22c55e22' :
                        t.type === 'error' ? '#ef444422' :
                        t.type === 'warning' ? '#f59e0b22' :
                        '#3b82f622',
            border: t.type === 'success' ? '1px solid #22c55e44' :
                    t.type === 'error' ? '1px solid #ef444444' :
                    t.type === 'warning' ? '1px solid #f59e0b44' :
                    '1px solid #3b82f644',
          }"
          @mouseenter="pause(t.id)"
          @mouseleave="resume(t.id)"
        >
          <span class="toast-icon" :style="{ color: colorMap[t.type] }">
            <SvgIcon v-if="t.type === 'success'" name="check" :size="18" />
            <SvgIcon v-else-if="t.type === 'error'" name="close" :size="18" />
            <SvgIcon v-else-if="t.type === 'warning'" name="settings" :size="18" />
            <SvgIcon v-else name="about" :size="18" />
          </span>
          <span class="toast-message" :style="{ color: 'var(--text-color)' }">{{ t.message }}</span>
          <button class="toast-close" @click="remove(t.id)">
            <SvgIcon name="close" :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'
import { useToast } from '@/composables/useToast'

withDefaults(defineProps<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}>(), {
  position: 'top-right',
})

const { toasts, remove, pause, resume, colorMap } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 360px;
}

.toast-container.top-right {
  top: 16px;
  right: 16px;
}

.toast-container.top-left {
  top: 16px;
  left: 16px;
}

.toast-container.bottom-right {
  bottom: 16px;
  right: 16px;
}

.toast-container.bottom-left {
  bottom: 16px;
  left: 16px;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--disabled-color);
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-color);
}

/* 动画 */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-move {
  transition: transform 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
</style>
