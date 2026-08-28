<template>
  <div class="app-root" :class="[`layout-${appStore.layoutType}`, { 'is-dark': appStore.isDark }]">
    <template v-if="isWindowRoute">
      <router-view />
    </template>
    <template v-else>
      <TitleBar v-if="appStore.layoutType !== '1'" />
      <div class="flex-1 overflow-hidden">
        <component :is="currentLayout" />
      </div>
    </template>

    <!-- 全局消息提示（右上角） -->
    <TToast position="top-right" />

    <!-- 关闭应用确认（隐藏到托盘 / 退出）：自包含标准模态，遮罩不用 backdrop-filter 以免 WebView2 闪烁 -->
    <div v-if="!isWindowRoute && showCloseModal" class="close-modal">
      <div class="close-modal-panel" role="dialog" aria-modal="true">
        <button class="close-modal-x" :title="$t('common.cancel')" @click="cancelClose">
          <SvgIcon name="close" :size="18" />
        </button>
        <h3 class="close-modal-title">{{ $t('closeConfirm.title') }}</h3>
        <p class="close-modal-msg">{{ $t('closeConfirm.message') }}</p>
        <div class="close-modal-remember">
          <TCheckbox v-model="rememberChoice" :label="$t('closeConfirm.dontAsk')" />
        </div>
        <div class="close-modal-actions">
          <TButton variant="outline" @click="closeToTray()">{{ $t('closeConfirm.hide') }}</TButton>
          <TButton variant="accent" @click="closeToQuit()">{{ $t('closeConfirm.quit') }}</TButton>
        </div>
      </div>
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
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import { useRuntimeStore } from '@/stores/runtime'
import { useI18n } from 'vue-i18n'
import { onEvent } from '@/services/ipc'
import Layout1 from '@/layouts/Layout1.vue'
import Layout2 from '@/layouts/Layout2.vue'
import Layout3 from '@/layouts/Layout3.vue'
import TitleBar from '@/components/TitleBar.vue'
import TToast from '@/components/TToast.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import TCheckbox from '@/components/form/TCheckbox.vue'
import TButton from '@/components/form/TButton.vue'
import { useCloseBehavior } from '@/composables/useCloseBehavior'
import { restoreWindowState } from '@/services/windowState'
import { installMainContextMenuGuard } from '@/utils/contextMenu'

const { showCloseModal, rememberChoice, initCloseBehavior, cancelClose, closeToTray, closeToQuit } = useCloseBehavior()

const isDev = import.meta.env.DEV
const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const pluginStore = usePluginStore()
const runtime = useRuntimeStore()
let unlistenPluginExit: (() => void) | null = null
let unlistenWindowClosed: (() => void) | null = null

const layoutMap: Record<string, any> = {
  '1': Layout1,
  '2': Layout2,
  '3': Layout3,
}

const currentLayout = computed(() => layoutMap[appStore.layoutType] || Layout1)
const isWindowRoute = computed(() => route.path.startsWith('/window'))

const { locale } = useI18n()
watch(() => appStore.locale, (val) => { locale.value = val }, { immediate: true })

function toggleDebug() {
  if (route.path === '/debug') {
    router.push('/')
  } else {
    router.push('/debug')
  }
}

onMounted(async () => {
  appStore.init()
  // 屏蔽主窗口 WebView2 默认右键菜单（不影响应用自定义菜单）
  installMainContextMenuGuard()
  // 屏蔽 F5 / Ctrl+R / Ctrl+F5 刷新：刷新会重载主窗口 JS 上下文，把插件 webview 的
  // 运行态（pages/currentKey 是模块级变量，刷新即清零）全部丢掉，导致已存在的子
  // webview 与新创建的 label 冲突，插件页就打不开了。
  window.addEventListener('keydown', blockRefresh, true)
  // 应用启动即加载插件列表，首页/侧边栏一进来就有数据（MyApps 里的懒加载保留做刷新兜底）
  pluginStore.loadPlugins()
  document.documentElement.setAttribute('data-blur', '1')
  initCloseBehavior()
  // 主窗口启动时恢复上次的位置与大小(子窗口 /window 跳过)
  if (!isWindowRoute.value) {
    await restoreWindowState()
    // 插件生命周期事件（子窗口 /window 不注册，避免重复处理）
    onEvent<string>('plugin-exit', (pid) => { void handlePluginExit(pid) })
      .then((fn) => { unlistenPluginExit = fn })
      .catch(() => {})
    onEvent<string>('plugin-window-closed', (pid) => { handlePluginWindowClosed(pid) })
      .then((fn) => { unlistenWindowClosed = fn })
      .catch(() => {})
  }
})

// 插件请求退出：内嵌形态关掉 webview 并跳回插件列表页；独立窗口形态关窗
//（fullscreen 由 closeWindow 内部顺带恢复主窗口）
async function handlePluginExit(pluginId: string) {
  const win = runtime.windows[pluginId]
  if (win && win.kind !== 'inline') {
    await runtime.closeWindow(pluginId)
  } else {
    await runtime.closeWindow(pluginId)
    if (route.path.startsWith(`/plugin/${pluginId}`)) router.push('/plugins')
  }
}

// 插件独立窗口被用户直接关闭（点 X）：清理运行登记；恢复逻辑按 kind 在 closeWindow 内处理
function handlePluginWindowClosed(pluginId: string) {
  if (runtime.windows[pluginId]) void runtime.closeWindow(pluginId)
}

function blockRefresh(e: KeyboardEvent) {
  if (
    e.key === 'F5' ||
    ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))
  ) {
    e.preventDefault()
    e.stopPropagation()
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', blockRefresh, true)
  unlistenPluginExit?.()
  unlistenWindowClosed?.()
})
</script>

<style lang="scss">
.app-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--right-bg-color);
  /* 皮肤：从左上角铺满的背景图 + 底部可读性遮罩（无皮肤时两者均为 none） */
  background-image: var(--skin-scrim, none), var(--skin-image, none);
  background-size: cover, cover;
  background-position: top left, top left;
  background-repeat: no-repeat;
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

/* 关闭应用确认：自包含标准模态。
   遮罩只用半透明底色（不用 backdrop-filter，避免 WebView2 每次重绘闪烁）；
   面板固定宽度、内容高度稳定，动画仅用 opacity/transform（走合成，不会闪）。 */
.close-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.close-modal-panel {
  position: relative;
  width: 400px;
  max-width: calc(100vw - 48px);
  padding: 24px;
  border-radius: 16px;
  background: var(--bg-setting-item);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  animation: close-modal-pop 0.16s ease-out;
}

@keyframes close-modal-pop {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.close-modal-x {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition: background 0.2s;
}

.close-modal-x:hover {
  background: var(--bg-hover-muted);
}

.close-modal-title {
  margin: 0 0 8px;
  padding-right: 28px; /* 避开右上角关闭按钮 */
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.close-modal-msg {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color);
}

.close-modal-remember {
  margin-top: 20px;
}

.close-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
