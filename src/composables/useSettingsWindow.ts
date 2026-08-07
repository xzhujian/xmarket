import { inTauri } from '@/services/ipc'

export function useSettingsWindow() {
  async function openInNewWindow() {
    if (!inTauri()) return
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

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

    // parent: 指定父窗口，由系统原生保证层级在父窗口之上、
    // 父窗口最小化时子窗口自动隐藏/恢复、父窗口关闭时子窗口自动销毁
    new WebviewWindow('settings', {
      url: '/window/settings',
      parent: getCurrentWindow(),
      width: 720,
      height: 560,
      title: '设置',
      decorations: false,
      resizable: false,
      center: true,
      skipTaskbar: true,
    })
  }

  return { openInNewWindow }
}
