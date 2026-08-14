<template>
  <div class="layout-1 flex h-screen">
    <!-- 左侧侧栏（贯穿到窗口顶部，Logo + 标题在侧栏顶部） -->
    <AppSidebar showLogo />

    <!-- 右侧：标题栏（仅窗口控制）+ 内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <TitleBar :show-logo="false" />
      <main class="flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import TitleBar from '@/components/TitleBar.vue'
</script>

<style lang="scss" scoped>
.layout-1 {
  .left-bar {
    border-right: 1px solid var(--line-color);
  }
}
</style>
