<template>
  <div class="empty-state">
    <slot name="icon">
      <SvgIcon :name="icon" :size="48" class="empty-icon" />
    </slot>
    <p class="empty-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'

defineProps<{
  icon: string
  text: string
}>()
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--disabled-color);
}

.empty-icon {
  color: var(--disabled-color);
  opacity: 0.4;
}

.empty-text {
  margin-top: 12px;
}
</style>
