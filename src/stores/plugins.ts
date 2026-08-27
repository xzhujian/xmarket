import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { useRuntimeStore } from '@/stores/runtime'

export interface PluginItem {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  /** 插件图标文件的绝对路径（无图标时为 null） */
  iconPath: string | null
  enabled: boolean
  sortOrder: number
  /** 页面打开方式：inline / window / fullscreen / select */
  openMode: string
  entryHtml: string
  /** 网络型插件的远程入口 URL（有值则打开插件即打开该地址） */
  entryUrl: string | null
  hasBackend: boolean
  /** 入口类型：frontend / server / app / backend */
  entryType: string
  /** server 型插件的启动命令 */
  entryCommand: string
  /** server 型插件的固定端口 */
  entryPort: number | null
  /** 插件来源市场地址（本地插件为 null） */
  source: string | null
  /** 常驻运行：离开插件页后是否保留运行 */
  keepAlive: boolean
  /** 插件自带图标（icon.svg/png...）经虚拟主机解析后的 URL，无图标时为 null */
  iconUrl: string | null
}

/** 把插件图标绝对路径经 Tauri asset 协议转成可加载的 URL（本地直读，不经 HTTP/IPC 转换） */
function resolveIconUrl(p: { iconPath: string | null }): string | null {
  return p.iconPath ? convertFileSrc(p.iconPath) : null
}

export const usePluginStore = defineStore('plugin', () => {
  const plugins = ref<PluginItem[]>([])

  /** 从 Rust 扫描加载插件列表 */
  async function loadPlugins() {
    try {
      const result = await invoke<PluginItem[]>('scan_plugins')
      plugins.value = result.map((p) => ({ ...p, iconUrl: resolveIconUrl(p) }))
    } catch (err) {
      console.error('扫描插件失败:', err)
    }
  }

  /** 安装插件（解压 zip） */
  async function installPlugin(zipPath: string): Promise<PluginItem | null> {
    try {
      const plugin = await invoke<PluginItem>('install_plugin', { zipPath })
      plugin.iconUrl = resolveIconUrl(plugin)
      const runtime = useRuntimeStore()
      // 若该插件已装（升级/重装）且窗口开着，先关掉，避免残留指向旧目录的 webview
      const existing = plugins.value.findIndex(p => p.id === plugin.id)
      if (existing >= 0) {
        await runtime.closeWindow(plugin.id)
        plugins.value[existing] = plugin
      } else {
        plugins.value.push(plugin)
      }
      return plugin
    } catch (err) {
      console.error('安装插件失败:', err)
      throw err
    }
  }

  /** 从市场安装插件：下载 zip → 落临时文件 → 解压安装 */
  async function installMarketPlugin(marketUrl: string, p: { id: string; downloadUrl?: string | null }) {
    if (!p.downloadUrl) throw new Error('该插件没有下载地址')
    const res = await fetch(marketUrl + p.downloadUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const bytes = await res.arrayBuffer()
    const zipPath = await invoke<string>('save_market_zip', { filename: `${p.id}.zip`, bytes })
    return installPlugin(zipPath)
  }

  /** 打包插件为 zip */
  async function packPlugin(id: string, outputPath: string): Promise<string> {
    try {
      return await invoke<string>('pack_plugin', { pluginId: id, outputPath })
    } catch (err) {
      console.error('打包插件失败:', err)
      throw err
    }
  }

  /** 卸载插件。removeData 为 true 时连数据目录一起删除（彻底卸载） */
  async function uninstallPlugin(id: string, removeData = false) {
    try {
      const runtime = useRuntimeStore()
      // 先关掉该插件的窗口（若开着），避免残留指向已删目录的 webview
      await runtime.closeWindow(id)
      await invoke('uninstall_plugin', { pluginId: id, removeData })
      plugins.value = plugins.value.filter(p => p.id !== id)
    } catch (err) {
      console.error('卸载插件失败:', err)
      throw err
    }
  }

  /** 切换启禁状态 */
  async function toggleEnabled(id: string) {
    const plugin = plugins.value.find(p => p.id === id)
    if (!plugin) return

    const newEnabled = !plugin.enabled
    try {
      await invoke('toggle_plugin', { id, enabled: newEnabled })
      plugin.enabled = newEnabled
    } catch (err) {
      console.error('切换插件状态失败:', err)
    }
  }

  /** 将排序列表中 fromIndex 的插件移到 toIndex（仅改内存 sortOrder，不落库，供拖动实时重排） */
  function moveLocal(fromIndex: number, toIndex: number) {
    const list = [...plugins.value].sort((a, b) => a.sortOrder - b.sortOrder)
    const [moved] = list.splice(fromIndex, 1)
    if (!moved || toIndex < 0 || toIndex > list.length) return
    list.splice(toIndex, 0, moved)
    list.forEach((p, idx) => { p.sortOrder = idx })
  }

  /** 把当前排序整体持久化到后端 */
  async function persistOrder() {
    const list = [...plugins.value].sort((a, b) => a.sortOrder - b.sortOrder)
    try {
      await Promise.all(list.map(p => invoke('set_plugin_sort', { id: p.id, sortOrder: p.sortOrder })))
    } catch (err) {
      console.error('保存排序失败:', err)
    }
  }

  const enabledPlugins = computed(() =>
    [...plugins.value]
      .filter(p => p.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  return {
    plugins,
    enabledPlugins,
    loadPlugins,
    installPlugin,
    installMarketPlugin,
    packPlugin,
    uninstallPlugin,
    toggleEnabled,
    moveLocal,
    persistOrder,
  }
})
