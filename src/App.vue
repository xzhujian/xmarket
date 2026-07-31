<template>
  <div class="app-root" :class="[`layout-${appStore.layoutType}`, { 'is-dark': appStore.isDark }]">
    <TitleBar />
    <div class="flex-1 overflow-hidden">
      <component :is="currentLayout" />
    </div>

    <!-- 调试入口按钮 — 仅在开发模式显示 -->
    <button
      v-if="isDev"
      class="debug-btn"
      :style="{ background: 'var(--accent-color)' }"
      :title="$route.path === '/debug' ? '关闭调试' : '调试面板'"
      @click="toggleDebug"
    >
      <SvgIcon name="cpu" :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import Layout1 from '@/layouts/Layout1.vue'
import Layout2 from '@/layouts/Layout2.vue'
import Layout3 from '@/layouts/Layout3.vue'
import TitleBar from '@/components/TitleBar.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const isDev = import.meta.env.DEV
const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const layoutMap: Record<string, any> = {
  '1': Layout1,
  '2': Layout2,
  '3': Layout3,
}

const currentLayout = computed(() => layoutMap[appStore.layoutType] || Layout1)

function toggleDebug() {
  if (route.path === '/debug') {
    router.push('/')
  } else {
    router.push('/debug')
  }
}

onMounted(() => {
  // 应用暗色模式
  document.documentElement.setAttribute('data-theme', appStore.isDark ? 'dark' : 'light')
  document.documentElement.setAttribute('data-blur', '1')
})
</script>

<style lang="scss">
.app-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--right-bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}

.debug-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 9999;
  cursor: pointer;
  border: none;
  opacity: 0.5;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.debug-btn:hover {
  opacity: 1;
  transform: scale(1.05);
}

.debug-btn:active {
  transform: scale(0.95);
}
</style>
