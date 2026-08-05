<template>
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
    <!-- 左侧：应用名称/图标 -->
    <div class="flex items-center gap-2" data-tauri-drag-region>
      <SvgIcon name="logo" :size="16" :style="{ color: 'var(--accent-color)' }" />
      <span class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">Framework App</span>
    </div>

    <!-- 右侧：应用功能 + 窗口控制 -->
    <div class="flex h-full items-center" data-tauri-drag-region="false">
      <!-- 亮暗切换 / 设置 -->
      <div class="flex items-center gap-0.5 px-1">
        <button
          class="tb-btn flex items-center justify-center"
          :title="appStore.isDark ? $t('theme.light') : $t('theme.dark')"
          @click="appStore.isDark = !appStore.isDark"
        >
          <SvgIcon :name="appStore.isDark ? 'sun' : 'moon'" :size="15" />
        </button>
        <button
          class="tb-btn flex items-center justify-center"
          :title="$t('nav.settings')"
          @click="openSettings"
        >
          <SvgIcon name="settings" :size="15" />
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="title-divider"></div>

      <!-- 窗口控制按钮 -->
      <!-- 最小化 -->
      <button
        class="win-btn flex items-center justify-center"
        :style="{
          width: '46px',
          height: '100%',
          background: 'transparent',
          color: 'var(--text-color)',
        }"
        @click="minimize"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--button-bg-color)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        title="最小化"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
        </svg>
      </button>

      <!-- 最大化/还原 -->
      <button
        class="win-btn flex items-center justify-center"
        :style="{
          width: '46px',
          height: '100%',
          background: 'transparent',
          color: 'var(--text-color)',
        }"
        @click="toggleMaximize"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--button-bg-color)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        :title="isMaximized ? '还原' : '最大化'"
      >
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1.5" y="1.5" width="9" height="9" rx="0.5" stroke="currentColor" stroke-width="1" fill="none"/>
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="3" y="0.5" width="8" height="8" rx="0.5" stroke="currentColor" stroke-width="1" fill="none"/>
          <rect x="0.5" y="3" width="8" height="8" rx="0.5" fill="var(--title-bar-bg, #f5f5f5)" stroke="currentColor" stroke-width="1"/>
        </svg>
      </button>

      <!-- 关闭 -->
      <button
        class="win-btn flex items-center justify-center"
        :style="{
          width: '46px',
          height: '100%',
          background: 'transparent',
          color: 'var(--text-color)',
        }"
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSettingsWindow } from '@/composables/useSettingsWindow'
import SvgIcon from '@/components/SvgIcon.vue'

const appStore = useAppStore()
const { openInNewWindow } = useSettingsWindow()
const isMaximized = ref(false)
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let unlisten: (() => void) | null = null

async function minimize() {
  if (!isTauri) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await getCurrentWebviewWindow().minimize()
}

async function toggleMaximize() {
  if (!isTauri) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const aw = getCurrentWebviewWindow()
  if (isMaximized.value) {
    await aw.unmaximize()
  } else {
    await aw.maximize()
  }
}

async function closeWin() {
  if (!isTauri) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await getCurrentWebviewWindow().close()
}

function openSettings() {
  openInNewWindow()
}

async function updateMaximized() {
  if (!isTauri) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  isMaximized.value = await getCurrentWebviewWindow().isMaximized()
}

onMounted(async () => {
  if (!isTauri) return
  await updateMaximized()
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  unlisten = await getCurrentWebviewWindow().onResized(() => {
    updateMaximized()
  })
})

onUnmounted(() => {
  if (unlisten) unlisten()
})
</script>

<style scoped>
.title-bar {
  flex-shrink: 0;
}

.win-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: none;
}

.win-btn:active {
  transform: none;
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-color);
  transition: background 0.2s;
}

.tb-btn:hover {
  background: var(--bg-hover-muted);
}

.title-divider {
  width: 1px;
  height: 18px;
  margin: 0 4px;
  background: var(--line-color);
  flex-shrink: 0;
}
</style>
