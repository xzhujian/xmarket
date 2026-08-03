<template>
  <div class="ibox" :class="sizeClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'sm',
})

const sizeMap: Record<string, string> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

const sizeClass = computed(() => sizeMap[props.size])
</script>

<style scoped>
.ibox {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-icon-box);
}

.ibox.sm {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.ibox.md {
  width: 64px;
  height: 64px;
  border-radius: 16px;
}

.ibox.lg {
  width: 80px;
  height: 80px;
  border-radius: 16px;
}
</style>
