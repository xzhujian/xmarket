import { ref, watch } from 'vue'
import { onEvent, call, inTauri } from '@/services/ipc'
import { useAppStore } from '@/stores/app'
import { pluginWebview } from '@/services/pluginWebview'
import { captureWindowState } from '@/services/windowState'

// 关闭确认模态的共享状态（主窗口单实例）
const showCloseModal = ref(false)
const rememberChoice = ref(false)
let initialized = false

// 模态打开时临时隐藏插件子 Webview（原生层压在 DOM 上会挡住模态），关闭时恢复
watch(showCloseModal, (v) => {
  if (v) pluginWebview.suspend()
  else pluginWebview.resume()
})

async function getWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

export function useCloseBehavior() {
  const appStore = useAppStore()

  // 监听后端的 close-requested（主窗口 X / Alt+F4 / 任务栏关闭都会触发），按配置决策
  function initCloseBehavior() {
    if (!inTauri()) return
    if (window.location.pathname.startsWith('/window')) return
    if (initialized) return
    initialized = true
    onEvent('close-requested', () => {
      const behavior = appStore.closeBehavior
      if (behavior === 'hide') {
        hideToTray()
      } else if (behavior === 'close') {
        quitApp()
      } else {
        showCloseModal.value = true
      }
    })
  }

  // 隐藏前记录窗口位置与大小,下次打开恢复
  async function hideToTray() {
    await captureWindowState()
    return getWindow().then((win) => win.hide())
  }

  // 退出前记录窗口位置与大小
  async function quitApp() {
    await captureWindowState()
    return call('quit_app')
  }

  // 模态按钮：隐藏到托盘（可勾选记住）
  async function closeToTray() {
    if (rememberChoice.value) appStore.setCloseBehavior('hide')
    rememberChoice.value = false
    showCloseModal.value = false
    await hideToTray()
  }

  // 模态按钮：退出（可勾选记住）
  async function closeToQuit() {
    if (rememberChoice.value) appStore.setCloseBehavior('close')
    rememberChoice.value = false
    showCloseModal.value = false
    await quitApp()
  }

  // 关闭弹窗但什么都不做（不隐藏也不退出，留在当前页面）
  function cancelClose() {
    showCloseModal.value = false
  }

  return {
    showCloseModal,
    rememberChoice,
    initCloseBehavior,
    cancelClose,
    closeToTray,
    closeToQuit,
  }
}
