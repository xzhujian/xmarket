import { inTauri } from '@/services/ipc'

export function useSettingsWindow() {
  async function openInNewWindow() {
    if (!inTauri()) return
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    new WebviewWindow('settings', {
      url: '/window/settings',
      width: 720,
      height: 560,
      title: '设置',
      decorations: false,
      resizable: false,
    })
  }

  return { openInNewWindow }
}
