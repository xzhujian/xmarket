import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Webview } from '@tauri-apps/api/webview'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useDebugStore } from '@/stores/debug'

/** 插件窗口形态。当前只实现内嵌子 webview；未来新增形态（如独立窗口）在此扩展 */
export type PluginWindowKind = 'inline'
/** 插件窗口显示态：active 前台 / hidden 隐藏(切走缓存) / suspended 模态临时隐藏 */
export type PluginViewState = 'active' | 'hidden' | 'suspended'

export interface PluginWindow {
  pluginId: string
  label: string
  url: string
  kind: PluginWindowKind
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
    const wv = new Webview(getCurrentWindow(), label, { url, ...rect })
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
  /** 当前前台插件窗口 id（其余已打开窗口保持存活但隐藏） */
  const activeId = ref<string | null>(null)

  function getWindow(id: string): PluginWindow | undefined {
    return windows.value[id]
  }

  /** 打开/切换到某插件的窗口：隐藏当前前台 → 显示目标 → 登记 */
  async function openWindow(
    pluginId: string,
    url: string,
    kind: PluginWindowKind = 'inline',
  ) {
    if (activeId.value && activeId.value !== pluginId) {
      const prev = windows.value[activeId.value]
      await execHide(activeId.value)
      if (prev) prev.viewState = 'hidden'
    }
    await execOpen(pluginId, url)
    windows.value[pluginId] = {
      pluginId,
      label: `${LABEL_PREFIX}${pluginId}`,
      url,
      kind,
      viewState: 'active',
    }
    activeId.value = pluginId
  }

  /** 已打开的窗口切到前台（不重建，直接显示） */
  async function switchTo(pluginId: string) {
    if (!windows.value[pluginId]) return
    if (activeId.value && activeId.value !== pluginId) {
      const prev = windows.value[activeId.value]
      await execHide(activeId.value)
      if (prev) prev.viewState = 'hidden'
    }
    await execShow(pluginId)
    windows.value[pluginId].viewState = 'active'
    activeId.value = pluginId
  }

  /** 隐藏某插件窗口（切走/离开页面缓存，实例保留） */
  async function hideWindow(pluginId: string) {
    await execHide(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'hidden'
    if (activeId.value === pluginId) activeId.value = null
  }

  /** 模态打开：临时隐藏某插件窗口（activeId 保留，模态关闭后恢复） */
  async function suspendWindow(pluginId: string) {
    await execHide(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'suspended'
  }

  /** 模态关闭：恢复显示某插件窗口 */
  async function resumeWindow(pluginId: string) {
    await execShow(pluginId)
    if (windows.value[pluginId]) windows.value[pluginId].viewState = 'active'
  }

  /** 彻底关闭某插件窗口（销毁 webview + 移除登记） */
  async function closeWindow(pluginId: string) {
    await execClose(pluginId)
    delete windows.value[pluginId]
    if (activeId.value === pluginId) activeId.value = null
  }

  /** 该插件窗口是否已打开（存活） */
  function hasWindow(pluginId: string): boolean {
    return !!windows.value[pluginId]
  }

  async function hideActive() {
    if (activeId.value) await hideWindow(activeId.value)
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
    getWindow,
    openWindow,
    switchTo,
    hideWindow,
    suspendWindow,
    resumeWindow,
    closeWindow,
    hasWindow,
    hideActive,
    suspendActive,
    resumeActive,
    bindContainer,
  }
})
