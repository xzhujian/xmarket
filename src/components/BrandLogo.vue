<!-- 品牌 Logo：有自定义图标（appIcon）时用自定义图，否则用默认 logo.ico -->
<template>
  <img
    :src="appStore.appIcon || '/logo.ico'"
    alt="logo"
    class="brand-logo"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'

withDefaults(defineProps<{ size?: number }>(), { size: 20 })

const appStore = useAppStore()
</script>

<style scoped>
.brand-logo {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
