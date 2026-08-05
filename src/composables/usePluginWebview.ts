import { ref, onUnmounted, type Ref } from 'vue'
import { Webview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'

export function usePluginWebview(containerRef: Ref<HTMLElement | null>) {
  const LABEL = 'plugin-content'

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
    if (!rect) return

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
    } catch {
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
    } catch { /* 忽略 */ }
  }

  /** 显示子 WebView */
  async function show() {
    if (!wvInstance) {
      wvInstance = await getExisting()
    }
    if (!wvInstance) return
    try {
      await wvInstance.show()
    } catch { /* 忽略 */ }
  }

  async function navigate(url: string) {
    await close()
    await open(url)
  }

  async function close() {
    if (wvInstance) {
      try {
        await wvInstance.close()
      } catch { /* 忽略 */ }
      wvInstance = null
    } else {
      const existing = await getExisting()
      if (existing) {
        try {
          await existing.close()
        } catch { /* 忽略 */ }
      }
    }
  }

  onUnmounted(() => { close() })

  return { open, navigate, close, hide, show, currentUrl }
}
