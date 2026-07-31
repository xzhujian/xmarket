<template>
  <div class="p-4 rounded-xl" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
    <div v-if="title" class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">{{ title }}</h3>
      <slot name="header" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>
