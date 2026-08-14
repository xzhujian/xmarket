<template>
  <div class="t-loading">
    <span class="t-loading-spinner" :style="{ width: size + 'px', height: size + 'px' }" />
    <span v-if="text" class="t-loading-text">{{ text }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** 可选文案（如"正在扫描插件..."） */
  text?: string
  /** 转圈尺寸(px) */
  size?: number
}>(), {
  size: 24,
})
</script>

<style scoped>
.t-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 0;
  color: var(--disabled-color);
}

.t-loading-spinner {
  flex-shrink: 0;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: t-loading-spin 0.6s linear infinite;
}

.t-loading-text {
  font-size: 14px;
}

@keyframes t-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
