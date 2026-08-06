import { inTauri } from '@/services/ipc'

export function useSettingsWindow() {
  async function openInNewWindow() {
    if (!inTauri()) return
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')

    // 防止重复打开
    const existing = WebviewWindow.getByLabel('settings')
    if (existing) {
      try {
        const win = await existing
        if (win) {
          await win.setFocus()
          return
        }
      } catch { /* 窗口已关闭或不存在，继续创建 */ }
    }

    new WebviewWindow('settings', {
      url: '/window/settings',
      width: 720,
      height: 560,
      title: '设置',
      decorations: false,
      resizable: false,
      alwaysOnTop: true,
    })
  }

  return { openInNewWindow }
}
