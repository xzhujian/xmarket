<template>
  <div class="market-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('market.all_apps') }}</h2>

    <!-- 即将上线 -->
    <div class="text-center py-12 rounded-xl" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
      <div class="text-3xl mb-3">🚀</div>
      <div class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">更多插件即将上线</div>
      <div class="text-xs mt-1" :style="{ color: 'var(--disabled-color)' }">应用市场正在建设中，敬请期待</div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
