<template>
  <div class="text-center py-12" :style="{ color: 'var(--disabled-color)' }">
    <slot name="icon">
      <SvgIcon :name="icon" :size="48" :style="{ color: 'var(--disabled-color)', opacity: 0.4 }" />
    </slot>
    <p class="mt-3">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'

defineProps<{
  icon: string
  text: string
}>()
</script>
