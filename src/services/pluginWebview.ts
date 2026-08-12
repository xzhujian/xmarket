import { Webview } from '@tauri-apps/api/webview'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useDebugStore } from '@/stores/debug'

/**
 * 插件内嵌子页面(子 Webview)管理器 —— 应用级单例。
 *
 * 为什么是单例、为什么放 services:
 *   - 子 Webview 是原生层,属于应用级资源,不是某个组件的私有状态;
 *   - 实例存活在组件之外:组件卸载只 hide(缓存),不 close,实现"页面缓存";
 *   - 会被多个地方访问:PluginHost(open/hide/show)、useCloseBehavior(suspend/resume)。
 *
 * 扩展点:
 *   pages 是 Map<key, PageEntry>,目前只维护单一活动页面(SINGLE_KEY)。
 *   未来要支持多页面并行/缓存时,只需让多个 entry 同时存活、按 key 切换,
 *   open() 内部逻辑天然支持,调用方 API 不变。
 */

interface PageEntry {
  key: string
  label: string
  url: string
  wv: Webview | null
  /** 是否正被模态 suspend(模态关闭后 resume 才能显示) */
  suspended: boolean
}

const LABEL_PREFIX = 'plugin-page-'
const SINGLE_KEY = 'single'

class PluginWebviewManager {
  private pages = new Map<string, PageEntry>()
  private activeKey: string | null = null
  private container: HTMLElement | null = null
  private observer: ResizeObserver | null = null
  private unlistenResize: (() => void) | null = null
  private syncTimer: number | null = null

  private get activeEntry(): PageEntry | null {
    return this.activeKey ? this.pages.get(this.activeKey) ?? null : null
  }

  /** 绑定容器 DOM 并启动尺寸跟随;传 null 解绑 */
  bindContainer(el: HTMLElement | null) {
    this.container = el
    this.observer?.disconnect()
    this.observer = null
    this.unlistenResize?.()
    this.unlistenResize = null
    if (el) {
      this.observer = new ResizeObserver(() => this.syncRect())
      this.observer.observe(el)
      // 内容区通常跟随主窗口缩放而变;容器 DOM 的 ResizeObserver 在 WebView2 里不可靠,
      // 补一个窗口级监听作为兜底,窗口(页面)尺寸一变就重新对齐。
      getCurrentWindow()
        .onResized(() => this.syncRect())
        .then((fn) => { this.unlistenResize = fn })
        .catch(() => {})
    }
  }

  private getContainerRect() {
    if (!this.container) return null
    const r = this.container.getBoundingClientRect()
    if (!r.width || !r.height) return null
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    }
  }

  /** 让子 Webview 对齐容器当前尺寸(容器缩放 / 布局变化时调用) */
  private syncRect() {
    const entry = this.activeEntry
    if (!entry?.wv) return
    const rect = this.getContainerRect()
    if (!rect) return
    const wv = entry.wv
    wv.setPosition(new LogicalPosition(rect.x, rect.y)).catch(() => {})
    wv.setSize(new LogicalSize(rect.width, rect.height)).catch(() => {})
  }

  /**
   * 打开(或切换到)某个 URL。
   * 缓存实例同 URL → 直接 show;URL 变了 → close 旧的 + 重建(JS API 无 navigate)。
   */
  async open(url: string) {
    const debug = useDebugStore()
    debug.info(`[Webview] open → ${url}`)
    const entry = await this.ensureEntry(url)
    if (!entry) return
    this.activeKey = entry.key
    entry.suspended = false
    await entry.wv?.show().catch(() => {})
    this.syncRect()
    const rect = this.getContainerRect()
    if (rect) {
      debug.info(
        `[Webview] 容器矩形 x=${rect.x} y=${rect.y} ${rect.width}x${rect.height}; 窗口内容 ${window.innerWidth}x${window.innerHeight}`,
      )
    }
    // 布局首帧后才完全稳定,延迟再补一次跟随,确保首开就填满容器
    this.scheduleSync()
  }

  /** 延迟重同步:等布局稳定后重新对齐一次 */
  private scheduleSync() {
    this.cancelSync()
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null
      this.syncRect()
    }, 120)
  }

  private cancelSync() {
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer)
      this.syncTimer = null
    }
  }

  private async ensureEntry(url: string): Promise<PageEntry | null> {
    const debug = useDebugStore()
    let entry = this.activeKey ? this.pages.get(this.activeKey) ?? null : null
    const needRecreate = !entry || entry.url !== url || !entry.wv
    if (!needRecreate) return entry

    // 关闭旧实例(如有)并清理注册表
    if (entry?.wv) {
      try { await entry.wv.close() } catch { /* 忽略 */ }
    }
    if (entry) this.pages.delete(entry.key)

    const rect = this.getContainerRect()
    if (!rect) {
      debug.warn('[Webview] container rect is null, cannot create webview')
      return null
    }
    const key = entry?.key ?? SINGLE_KEY
    const label = `${LABEL_PREFIX}${key}`
    try {
      const wv = new Webview(getCurrentWindow(), label, { url, ...rect })
      const newEntry: PageEntry = { key, label, url, wv, suspended: false }
      this.pages.set(key, newEntry)
      return newEntry
    } catch (e) {
      debug.error(`[Webview] create failed: ${e}`)
      return null
    }
  }

  /** 隐藏子 Webview(离开页面 / 缓存) */
  async hide() {
    await this.activeEntry?.wv?.hide().catch(() => {})
  }

  /** 显示子 Webview(回到页面);被模态 suspend 时不提前显示 */
  async show() {
    const entry = this.activeEntry
    if (!entry || entry.suspended) return
    await entry.wv?.show().catch(() => {})
  }

  /** 模态打开:临时隐藏,让模态露出 */
  async suspend() {
    const entry = this.activeEntry
    if (!entry) return
    entry.suspended = true
    await entry.wv?.hide().catch(() => {})
  }

  /** 模态关闭:恢复显示 */
  async resume() {
    const entry = this.activeEntry
    if (!entry) return
    entry.suspended = false
    await entry.wv?.show().catch(() => {})
  }

  /** 彻底销毁当前页面(应用退出前的清理) */
  async close() {
    this.cancelSync()
    const entry = this.activeEntry
    if (!entry) return
    if (entry.wv) {
      try { await entry.wv.close() } catch { /* 忽略 */ }
    }
    this.pages.delete(entry.key)
    this.activeKey = null
  }
}

/** 应用级单例:所有组件共享同一个子页面实例 */
export const pluginWebview = new PluginWebviewManager()
