import { useRouter } from 'vue-router'
import { usePluginStore, type PluginItem } from '@/stores/plugins'
import { useRuntimeStore, type PluginWindowKind } from '@/stores/runtime'
import { resolvePluginUrl } from '@/services/pluginUrl'

/** 统一的「打开插件」入口：按 manifest 的 openMode 分派——
   *  select → 每次进入通用选择页由用户挑(不记忆)；inline → 路由进内嵌子页面；
   *  window / fullscreen → 打开独立窗口。 */
export function usePluginOpen() {
  const router = useRouter()
  const pluginStore = usePluginStore()
  const runtime = useRuntimeStore()

  async function openPlugin(plugin: PluginItem) {
    runtime.selectedPluginId = plugin.id
    if (plugin.openMode === 'select') {
      // 每次打开都先到通用选择页,由用户挑本次的打开方式(不记忆)
      router.push(`/plugin/${plugin.id}/pick`)
    } else if (plugin.openMode === 'window' || plugin.openMode === 'fullscreen') {
      const url = await resolvePluginUrl(plugin.entryHtml, plugin.entryUrl ?? null)
      if (!url) return
      await runtime.openWindow(
        plugin.id,
        url,
        plugin.keepAlive ?? false,
        plugin.openMode as PluginWindowKind,
        plugin.name,
      )
    } else {
      router.push(`/plugin/${plugin.id}`)
    }
  }

  return { openPlugin }
}