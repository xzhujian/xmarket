<template>
  <div
    class="title-bar flex items-center select-none"
    :style="{
      background: appStore.isDark ? 'rgba(27,27,27,0.62)' : 'rgba(245,245,245,0.62)',
      borderBottom: '1px solid var(--line-color)',
      height: '36px',
      paddingLeft: '12px',
      paddingRight: '0',
    }"
  >
    <!-- 顶部 resize 热区 -->
    <div class="resize-handle-top" @mousedown="onResizeTopMouseDown"></div>

    <!-- 左侧：应用名称/图标 + 拖动区域 -->
    <div ref="dragRegionRef" class="flex items-center gap-2 flex-1 h-full cursor-default">
      <template v-if="showLogo">
        <SvgIcon name="logo" :size="16" :style="{ color: 'var(--accent-color)' }" />
        <span class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">Framework App</span>
      </template>
    </div>

    <!-- 右侧：应用功能 + 窗口控制 -->
    <div class="flex h-full items-center">
      <!-- 亮暗切换 / 设置 -->
      <div class="flex items-center gap-1.5 px-1">
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
      <button
        class="win-btn flex items-center justify-center"
        :style="{ width: '46px', height: '100%', background: 'transparent', color: 'var(--text-color)' }"
        @click="minimize"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--button-bg-color)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        title="最小化"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
        </svg>
      </button>
      <button
        class="win-btn flex items-center justify-center"
        :style="{ width: '46px', height: '100%', background: 'transparent', color: 'var(--text-color)' }"
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
const dragRegionRef = ref<HTMLElement | null>(null)

withDefaults(defineProps<{
  showLogo?: boolean
}>(), {
  showLogo: true,
})

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

// —— 窗口拖动（手动 API，替代 data-tauri-drag-region） ——
let lastClickTime = 0
let lastClickX = 0
let lastClickY = 0

function onDragMouseDown(e: MouseEvent) {
  if (!isTauri) return
  e.preventDefault()

  const now = Date.now()
  const isDblClick =
    now - lastClickTime < 350 &&
    Math.abs(e.screenX - lastClickX) < 10 &&
    Math.abs(e.screenY - lastClickY) < 10

  lastClickTime = now
  lastClickX = e.screenX
  lastClickY = e.screenY

  if (isDblClick) {
    toggleMaximize()
    return
  }

  import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
    getCurrentWindow().startDragging()
  })
}

// —— 顶部 resize（原生） ——
function onResizeTopMouseDown(e: MouseEvent) {
  if (!isTauri) return
  e.preventDefault()

  import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
    try {
      await getCurrentWindow().startResizeDragging('North')
    } catch (err) {
      console.error('[TitleBar] startResizeDrag failed:', err)
    }
  }).catch((err) => {
    console.error('[TitleBar] import failed:', err)
  })
}

onMounted(async () => {
  if (!isTauri) return
  await updateMaximized()
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  unlisten = await getCurrentWebviewWindow().onResized(() => {
    updateMaximized()
  })

  // 绑定手动拖动监听
  if (dragRegionRef.value) {
    dragRegionRef.value.addEventListener('mousedown', onDragMouseDown)
  }
})

onUnmounted(() => {
  if (unlisten) unlisten()
  if (dragRegionRef.value) {
    dragRegionRef.value.removeEventListener('mousedown', onDragMouseDown)
  }
})
</script>

<style scoped>
.title-bar {
  flex-shrink: 0;
  position: relative;
}

/* 顶部 6px resize 热区 */
.resize-handle-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  z-index: 100;
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
  width: 26px;
  height: 26px;
  border-radius: 6px;
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
