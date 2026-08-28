import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Webview } from '@tauri-apps/api/webview'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { useDebugStore } from '@/stores/debug'

/** 插件窗口形态：inline 内嵌子 webview；window/fullscreen 独立窗口 */
export type PluginWindowKind = 'inline' | 'window' | 'fullscreen'
/** 插件窗口显示态：active 前台 / suspended 模态临时隐藏 / hidden 常驻但离开页面 */
export type PluginViewState = 'active' | 'suspended' | 'hidden'

export interface PluginWindow {
  pluginId: string
  label: string
  url: string
  kind: PluginWindowKind
  keepAlive: boolean
  viewState: PluginViewState
}

// ─── 物理执行层（非响应式，不参与状态管理）────────────────────
// 内嵌子 Webview 的创建/显示/隐藏/销毁 + 容器尺寸跟随。
// 这些是"怎么执行"，不是"状态"，放模块级避免被 Pinia 的响应式代理污染。
interface PageEntry {
  key: string
  label: string
  url: string
  wv: Webview | null
}

const LABEL_PREFIX = 'plugin-page-'
/** 已创建的物理 webview 资源池 */
const pages = new Map<string, PageEntry>()
/** 当前显示在容器里的 webview key（物理执行态，用于尺寸对齐） */
let currentKey: string | null = null
let container: HTMLElement | null = null
let observer: ResizeObserver | null = null
let unlistenResize: (() => void) | null = null
let syncTimer: number | null = null

/** 绑定容器 DOM 并启动尺寸跟随;传 null 解绑 */
function bindContainer(el: HTMLElement | null) {
  container = el
  observer?.disconnect()
  observer = null
  unlistenResize?.()
  unlistenResize = null
  if (el) {
    observer = new ResizeObserver(() => syncRect())
    observer.observe(el)
    // 内容区通常跟随主窗口缩放而变;容器 DOM 的 ResizeObserver 在 WebView2 里不可靠,
    // 补一个窗口级监听作为兜底,窗口(页面)尺寸一变就重新对齐。
    getCurrentWindow()
      .onResized(() => syncRect())
      .then((fn) => { unlistenResize = fn })
      .catch(() => {})
  }
}

function getContainerRect() {
  if (!container) return null
  const r = container.getBoundingClientRect()
  if (!r.width || !r.height) return null
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  }
}

/** 让当前显示的子 Webview 对齐容器当前尺寸(容器缩放 / 布局变化时调用) */
function syncRect() {
  if (!currentKey) return
  const entry = pages.get(currentKey)
  if (!entry?.wv) return
  const rect = getContainerRect()
  if (!rect) return
  entry.wv.setPosition(new LogicalPosition(rect.x, rect.y)).catch(() => {})
  entry.wv.setSize(new LogicalSize(rect.width, rect.height)).catch(() => {})
}

function scheduleSync() {
  cancelSync()
  syncTimer = window.setTimeout(() => {
    syncTimer = null
    syncRect()
  }, 120)
}

function cancelSync() {
  if (syncTimer !== null) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
}

/** 确保 key 对应插件有一个可用的子 Webview 实例;URL 变了才重建该 key 自己的,不影响其他插件 */
async function ensureEntry(key: string, url: string): Promise<PageEntry | null> {
  const debug = useDebugStore()
  let entry = pages.get(key) ?? null
  const needRecreate = !entry || entry.url !== url || !entry.wv
  if (!needRecreate) return entry

  if (entry?.wv) {
    try { await entry.wv.close() } catch { /* 忽略 */ }
  }
  if (entry) pages.delete(key)

  const rect = getContainerRect()
  if (!rect) {
    debug.warn('[Window] container rect is null, cannot create webview')
    return null
  }
  const label = `${LABEL_PREFIX}${key}`
  try {
    // 由 Rust 侧创建（带初始化脚本，注入自定义右键菜单），再按 label 拿 JS 句柄。
    await invoke('create_plugin_webview', {
      label,
      url,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    const wv = await Webview.getByLabel(label)
    if (!wv) {
      debug.error(`[Window] created but handle missing: ${label}`)
      return null
    }
    const newEntry: PageEntry = { key, label, url, wv }
    pages.set(key, newEntry)
    return newEntry
  } catch (e) {
    debug.error(`[Window] create failed: ${e}`)
    return null
  }
}

/** 打开/显示某插件窗口（创建或复用实例）。隐藏旧前台由上层编排 */
async function execOpen(key: string, url: string) {
  const debug = useDebugStore()
  debug.info(`[Window] open → ${key} ${url}`)
  const entry = await ensureEntry(key, url)
  if (!entry) return
  currentKey = key
  await entry.wv?.show().catch(() => {})
  syncRect()
  const rect = getContainerRect()
  if (rect) {
    debug.info(
      `[Window] 容器矩形 x=${rect.x} y=${rect.y} ${rect.width}x${rect.height}; 窗口内容 ${window.innerWidth}x${window.innerHeight}`,
    )
  }
  scheduleSync()
}

async function execHide(key: string) {
  if (currentKey !== key) return
  await pages.get(key)?.wv?.hide().catch(() => {})
  currentKey = null
}

async function execShow(key: string) {
  const entry = pages.get(key)
  if (!entry?.wv) return
  currentKey = key
  await entry.wv.show().catch(() => {})
  syncRect()
}

async function execClose(key: string) {
  cancelSync()
  const entry = pages.get(key)
  if (!entry) return
  if (entry.wv) {
    try { await entry.wv.close() } catch { /* 忽略 */ }
  }
  pages.delete(key)
  if (currentKey === key) currentKey = null
}

// ─── 独立窗口形态（openMode: window / fullscreen）物理执行层 ──────────

const STANDALONE_PREFIX = 'plugin-window-'

/** 创建/恢复独立插件窗口；fullscreen 形态由后端隐藏主窗口（窗口本身非全屏） */
async function execOpenStandalone(pluginId: string, url: string, kind: 'window' | 'fullscreen', title: string) {
  const debug = useDebugStore()
  try {
    await invoke('create_plugin_window', {
      pluginId,
      url,
      title,
      fullscreen: kind === 'fullscreen',
    })
  } catch (e) {
    debug.error(`[Window] create standalone failed: ${e}`)
  }
}

/** 隐藏独立插件窗口（常驻保留运行，不销毁）；fullscreen 形态同时恢复主窗口 */
async function execHideStandalone(pluginId: string, wasFullscreen: boolean) {
  const debug = useDebugStore()
  try {
    if (wasFullscreen) {
      await invoke('restore_main_window')
    }
    const w = await WebviewWindow.getByLabel(`${STANDALONE_PREFIX}${pluginId}`)
    if (w) {
      await w.hide().catch(() => {})
    }
  } catch (e) {
    debug.error(`[Window] hide standalone failed: ${e}`)
  }
}

/** 关闭独立插件窗口；fullscreen 形态同时恢复主窗口（连同其子 webview） */
async function execCloseStandalone(pluginId: string, wasFullscreen: boolean) {
  const debug = useDebugStore()
  try {
    if (wasFullscreen) {
      await invoke('restore_main_window')
    }
    const w = await WebviewWindow.getByLabel(`${STANDALONE_PREFIX}${pluginId}`)
    if (w) {
      await w.close().catch(() => {})
    }
  } catch (e) {
    debug.error(`[Window] close standalone failed: ${e}`)
  }
}

// ─── 插件窗口管理（响应式状态 + 统一编排）────────────────────

/** 所有插件窗口状态变化的唯一入口/真相源。
 *
 * 本 store 承载插件窗口管理的完整职责：登记状态（windows/activeId）、
 * 编排状态切换、以及内嵌子 Webview 的物理执行。后续新增窗口形态或状态，
 * 只在这一块扩展（如扩展 PluginWindowKind 并按其分发不同执行方式）。
 */
export const useRuntimeStore = defineStore('runtime', () => {
  /** 已打开的插件窗口（key = 插件 id） */
  const windows = ref<Record<string, PluginWindow>>({})
  /** 当前前台插件窗口 id */
  const activeId = ref<string | null>(null)
  /** 导航高亮选中的插件 id（点谁亮谁，独立于内嵌前台 activeId） */
  const selectedPluginId = ref<string | null>(null)

  /** 打开某插件窗口：切入启动。开新插件前统一清场——其它已开插件按 keepAlive 决定去留：
   *  常驻(keepAlive) 隐藏保留（内嵌 hide webview / 独立 hide 窗口，fullscreen 形态先恢复主窗口）；
   *  非常驻彻底关闭。目标插件已隐藏时直接复用实例。kind=window/fullscreen 为独立窗口形态。 */
  async function openWindow(
    pluginId: string,
    url: string,
    keepAlive = false,
    kind: PluginWindowKind = 'inline',
    title = pluginId,
  ) {
    for (const id of Object.keys(windows.value)) {
      if (id === pluginId) continue
      const win = windows.value[id]
      if (win?.keepAlive) {
        if (win.kind === 'inline') {
          if (activeId.value === id) activeId.value = null
          await execHide(id)
        } else {
          await execHideStandalone(id, win.kind === 'fullscreen')
        }
        win.viewState = 'hidden'
      } else {
        await closeWindow(id)
      }
    }
    if (kind === 'inline') {
      await execOpen(pluginId, url)
    } else {
      await execOpenStandalone(pluginId, url, kind, title)
    }
    windows.value[pluginId] = {
      pluginId,
      label: kind === 'inline' ? `${LABEL_PREFIX}${pluginId}` : `${STANDALONE_PREFIX}${pluginId}`,
      url,
      kind,
      keepAlive,
      viewState: 'active',
    }
    if (kind === 'inline') activeId.value = pluginId
  }

  /** 模态打开：临时隐藏当前前台插件窗口（activeId 保留，模态关闭后恢复） */
  async function suspendWindow(pluginId: string) {
    await execHide(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'suspended'
  }

  /** 模态关闭：恢复显示某插件窗口 */
  async function resumeWindow(pluginId: string) {
    await execShow(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'active'
  }

  /** 常驻插件离开页面：隐藏 webview 但保留运行，可再次切入 */
  async function leaveWindow(pluginId: string) {
    await execHide(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'hidden'
    if (activeId.value === pluginId) activeId.value = null
  }

  /** 退出关闭：销毁独立窗口（并恢复主窗口）或内嵌 webview，统一移除登记 */
  async function closeWindow(pluginId: string) {
    const kind = windows.value[pluginId]?.kind ?? 'inline'
    if (kind !== 'inline') {
      await execCloseStandalone(pluginId, kind === 'fullscreen')
    } else {
      await execClose(pluginId)
    }
    delete windows.value[pluginId]
    if (activeId.value === pluginId) activeId.value = null
  }

  async function suspendActive() {
    if (activeId.value) await suspendWindow(activeId.value)
  }

  async function resumeActive() {
    if (activeId.value) await resumeWindow(activeId.value)
  }

  return {
    windows,
    activeId,
    selectedPluginId,
    openWindow,
    closeWindow,
    leaveWindow,
    suspendActive,
    resumeActive,
    bindContainer,
  }
})
