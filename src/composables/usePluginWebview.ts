import { onMounted, onUnmounted, type Ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtime'

/**
 * 组件内访问插件窗口的薄壳:绑定容器 + 透出 runtime store 的窗口管理方法。
 * 插件窗口管理（状态 + 物理执行）统一在 runtime store,这里只做容器绑定与透传;
 * 组件卸载只解绑容器(不销毁 webview),实现"页面缓存"。
 */
export function usePluginWebview(containerRef: Ref<HTMLElement | null>) {
  const runtime = useRuntimeStore()

  onMounted(() => {
    runtime.bindContainer(containerRef.value)
  })
  onUnmounted(() => {
    runtime.bindContainer(null)
  })

  return {
    open: (key: string, url: string, keepAlive = false) => runtime.openWindow(key, url, keepAlive),
    navigate: (key: string, url: string, keepAlive = false) => runtime.openWindow(key, url, keepAlive),
    close: (key: string) => runtime.closeWindow(key),
    leave: (key: string) => runtime.leaveWindow(key),
    suspend: () => runtime.suspendActive(),
    resume: () => runtime.resumeActive(),
  }
}
