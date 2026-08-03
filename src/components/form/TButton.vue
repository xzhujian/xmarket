<template>
  <button
    class="tbtn"
    :class="[variant, { loading, disabled: disabled || loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="tbtn-spinner" />
    <span v-else class="tbtn-content">
      <SvgIcon v-if="icon" :name="icon" :size="iconSize" class="tbtn-icon" />
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'

withDefaults(defineProps<{
  variant?: 'accent' | 'outline' | 'text'
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconSize?: number
}>(), {
  variant: 'accent',
  iconSize: 16,
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.tbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  white-space: nowrap;
  line-height: 1.4;
  cursor: pointer;
  border: none;
  outline: none;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.tbtn:active {
  transform: scale(0.97);
}

.tbtn-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tbtn-icon {
  flex-shrink: 0;
}

/* ===== Accent ===== */
.tbtn.accent {
  color: #fff;
  background: var(--accent-color);
}

.tbtn.accent:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.35);
}

.tbtn.accent.disabled {
  color: var(--disabled-color);
  background: var(--button-bg-color);
  cursor: not-allowed;
  box-shadow: none;
}

/* ===== Outline ===== */
.tbtn.outline {
  color: var(--accent-color);
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--accent-color);
}

.tbtn.outline:hover {
  color: #fff;
  background: var(--accent-color);
}

.tbtn.outline.disabled {
  color: var(--disabled-color);
  box-shadow: inset 0 0 0 1px var(--line-color);
  cursor: not-allowed;
}

/* ===== Text ===== */
.tbtn.text {
  color: var(--text-color);
  background: transparent;
}

.tbtn.text:hover {
  background: var(--bg-hover-muted);
}

.tbtn.text.disabled {
  color: var(--disabled-color);
  cursor: not-allowed;
}

/* ===== Loading ===== */
.tbtn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: tbtn-spin 0.6s linear infinite;
}

.tbtn.outline .tbtn-spinner,
.tbtn.text .tbtn-spinner {
  border-color: rgba(0, 0, 0, 0.12);
  border-top-color: var(--accent-color);
}

@keyframes tbtn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
