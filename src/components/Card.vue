<template>
  <div class="card">
    <div v-if="title" class="card-header">
      <h3 class="card-title">{{ title }}</h3>
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

<style scoped>
.card {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-setting-item);
  border: 1px solid var(--line-color);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}
</style>
