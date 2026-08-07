<template>
  <div class="layout-2 flex h-full">
    <!-- 左侧标准侧栏（分区） -->
    <AppSidebar />

    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <main class="flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<style lang="scss" scoped>
.layout-2 {
  .left-bar {
    border-right: 1px solid var(--line-color);
  }
}
</style>
