import { onMounted, onUnmounted, type Ref } from 'vue'
import { pluginWebview } from '@/services/pluginWebview'

/**
 * 组件内访问子 Webview 的薄壳:绑定容器并透出 manager 方法。
 * 真正的实例与状态都在 services/pluginWebview 单例里;
 * 组件卸载只解绑容器(不销毁 webview),实现"页面缓存"。
 */
export function usePluginWebview(containerRef: Ref<HTMLElement | null>) {
  const manager = pluginWebview

  onMounted(() => {
    manager.bindContainer(containerRef.value)
  })
  onUnmounted(() => {
    manager.bindContainer(null)
  })

  return {
    open: (url: string) => manager.open(url),
    navigate: (url: string) => manager.open(url),
    close: () => manager.close(),
    hide: () => manager.hide(),
    show: () => manager.show(),
    suspend: () => manager.suspend(),
    resume: () => manager.resume(),
  }
}
