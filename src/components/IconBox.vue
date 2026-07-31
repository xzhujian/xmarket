<template>
  <div
    class="flex items-center justify-center"
    :class="sizeClass"
    :style="{ background: 'var(--bg-icon-box)' }"
  >
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
  sm: 'w-10 h-10 rounded-lg',
  md: 'w-16 h-16 rounded-2xl',
  lg: 'w-20 h-20 rounded-2xl',
}

const sizeClass = computed(() => sizeMap[props.size])
</script>
