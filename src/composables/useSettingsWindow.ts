import { inTauri } from '@/services/ipc'

export function useSettingsWindow() {
  // 每次打开都新建设置窗口(关闭即销毁)。这样每次打开都是一次全新窗口,
  // 会触发 Windows 系统自带的弹出效果(WebView2 首帧渲染 + 窗口弹出动画)。
  // 创建时隐藏,由 SubWindowLayout 挂载后再显示,避免白屏加载一闪。
  async function open() {
    if (!inTauri()) return
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    // 防止重复打开:已存在则直接显示并聚焦
    const existing = WebviewWindow.getByLabel('settings')
    if (existing) {
      try {
        const win = await existing
        if (win) {
          await win.show().catch(() => {})
          await win.setFocus().catch(() => {})
          return
        }
      } catch { /* 窗口已关闭或不存在,继续创建 */ }
    }

    // parent: 指定父窗口,由系统原生保证层级在父窗口之上、
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
      // 隐藏创建,由 SubWindowLayout 挂载后显示
      visible: false,
    })
  }

  return { open }
}
