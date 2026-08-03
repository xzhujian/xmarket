import { ref, onUnmounted, type Ref } from 'vue'
import { Webview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useDebugStore } from '@/stores/debug'

export function usePluginWebview(containerRef: Ref<HTMLElement | null>) {
  const LABEL = 'plugin-content'
  const debug = useDebugStore()

  const currentUrl = ref('')
  let wvInstance: Webview | null = null

  function getContainerRect(): { x: number; y: number; width: number; height: number } | null {
    const el = containerRef.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }

  async function getExisting(): Promise<Webview | null> {
    try {
      return await Webview.getByLabel(LABEL)
    } catch {
      return null
    }
  }

  async function open(url: string) {
    await close()

    const rect = getContainerRect()
    if (!rect) {
      debug.warn('容器无尺寸，跳过创建')
      return
    }

    debug.info(`创建子 WebView (${rect.width}×${rect.height} @ ${rect.x},${rect.y})`)

    currentUrl.value = url

    try {
      const appWindow = getCurrentWindow()
      wvInstance = new Webview(appWindow, LABEL, {
        url,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
      debug.info('子 WebView 创建成功')
    } catch (err) {
      debug.error(`创建子 WebView 失败: ${err}`)
      wvInstance = null
    }
  }

  /** 隐藏子 WebView */
  async function hide() {
    if (!wvInstance) {
      wvInstance = await getExisting()
    }
    if (!wvInstance) return
    try {
      await wvInstance.hide()
      debug.info('子 WebView 已隐藏')
    } catch (err) {
      debug.error(`隐藏子 WebView 失败: ${err}`)
    }
  }

  /** 显示子 WebView */
  async function show() {
    if (!wvInstance) {
      wvInstance = await getExisting()
    }
    if (!wvInstance) return
    try {
      await wvInstance.show()
      debug.info('子 WebView 已显示')
    } catch (err) {
      debug.error(`显示子 WebView 失败: ${err}`)
    }
  }

  async function navigate(url: string) {
    debug.info(`切换插件: ${url}`)
    await close()
    await open(url)
  }

  async function close() {
    if (wvInstance) {
      try {
        await wvInstance.close()
        debug.info('子 WebView 已关闭')
      } catch { /* 忽略 */ }
      wvInstance = null
    } else {
      const existing = await getExisting()
      if (existing) {
        try {
          await existing.close()
          debug.info('已关闭残留 WebView')
        } catch { /* 忽略 */ }
      }
    }
  }

  onUnmounted(() => { close() })

  return { open, navigate, close, hide, show, currentUrl }
}
