<template>
  <div class="messages-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('message.title') }}</h2>

    <EmptyState icon="messages" :text="$t('message.empty')" />
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>
