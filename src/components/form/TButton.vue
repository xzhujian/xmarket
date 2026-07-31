<template>
  <button
    class="btn"
    :class="[variant, { loading }]"
    :disabled="disabled || loading"
    :style="btnStyle"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner" />
    <span v-if="!loading" class="btn-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'accent' | 'outline' | 'text'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'accent',
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const btnStyle = computed(() => {
  switch (props.variant) {
    case 'accent':
      return {
        background: props.disabled ? 'var(--button-bg-color)' : 'var(--accent-color)',
        color: props.disabled ? 'var(--disabled-color)' : '#fff',
        border: 'none',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
      }
    case 'outline':
      return {
        background: 'transparent',
        color: props.disabled ? 'var(--disabled-color)' : 'var(--text-color)',
        border: '1px solid var(--line-color)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
      }
    case 'text':
      return {
        background: 'transparent',
        color: props.disabled ? 'var(--disabled-color)' : 'var(--text-color)',
        border: 'none',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        padding: '4px 8px',
      }
    default:
      return {}
  }
})
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1.4;
}

.btn:not(:disabled):active {
  transform: scale(0.97);
}

.btn.accent:not(:disabled):hover {
  background: var(--accent-hover) !important;
}

.btn.outline:not(:disabled):hover {
  background: var(--bg-hover-muted);
}

.btn.text:not(:disabled):hover {
  background: var(--bg-hover-muted);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn.outline .btn-spinner,
.btn.text .btn-spinner {
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: var(--accent-color);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
