<template>
  <div class="subwindow-layout flex flex-col h-screen" :style="{ background: 'var(--right-bg-color)' }">
    <!-- 自定义标题栏 -->
    <div
      class="title-bar flex items-center justify-between select-none"
      :style="{
        background: appStore.isDark ? '#1b1b1b' : '#f5f5f5',
        borderBottom: '1px solid var(--line-color)',
        height: '36px',
        paddingLeft: '12px',
        paddingRight: '0',
      }"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2" data-tauri-drag-region>
        <SvgIcon name="logo" :size="16" :style="{ color: 'var(--accent-color)' }" />
        <span class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">{{ title }}</span>
      </div>

      <!-- 窗口控制按钮 -->
      <div class="flex h-full items-center" data-tauri-drag-region="false">
        <button
          class="win-btn flex items-center justify-center"
          :style="{ width: '46px', height: '100%', background: 'transparent', color: 'var(--text-color)' }"
          @click="minimize"
          @mouseenter="onHover($event, true)"
          @mouseleave="onHover($event, false)"
          title="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          class="win-btn flex items-center justify-center"
          :style="{ width: '46px', height: '100%', background: 'transparent', color: 'var(--text-color)' }"
          @click="closeWin"
          @mouseenter="($event.currentTarget as HTMLElement).style.background = '#e81123'; ($event.currentTarget as HTMLElement).style.color = '#fff'"
          @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-color)'"
          title="关闭"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-hidden">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { inTauri } from '@/services/ipc'
import SvgIcon from '@/components/SvgIcon.vue'

const route = useRoute()
const appStore = useAppStore()

const title = route.meta.title as string || ''

function onHover(e: MouseEvent, enter: boolean) {
  const el = e.currentTarget as HTMLElement
  el.style.background = enter ? 'var(--button-bg-color)' : 'transparent'
}

async function minimize() {
  if (!inTauri()) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await getCurrentWebviewWindow().minimize()
}

async function closeWin() {
  if (!inTauri()) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await getCurrentWebviewWindow().close()
}
</script>

<style scoped>
.win-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: none;
}

.win-btn:active {
  transform: none;
}
</style>
