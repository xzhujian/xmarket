import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface PluginItem {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  enabled: boolean
  sortOrder: number
  display: string
  entryHtml: string
  hasBackend: boolean
}

export const usePluginStore = defineStore('plugin', () => {
  const plugins = ref<PluginItem[]>([])

  /** 从 Rust 扫描加载插件列表 */
  async function loadPlugins() {
    try {
      const result = await invoke<PluginItem[]>('scan_plugins')
      plugins.value = result
    } catch (err) {
      console.error('扫描插件失败:', err)
    }
  }

  /** 安装插件（解压 zip） */
  async function installPlugin(zipPath: string): Promise<PluginItem | null> {
    try {
      const plugin = await invoke<PluginItem>('install_plugin', { zipPath })
      // 追加到列表
      const existing = plugins.value.findIndex(p => p.id === plugin.id)
      if (existing >= 0) {
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

  /** 打包插件为 zip */
  async function packPlugin(id: string, outputPath: string): Promise<string> {
    try {
      return await invoke<string>('pack_plugin', { pluginId: id, outputPath })
    } catch (err) {
      console.error('打包插件失败:', err)
      throw err
    }
  }

  /** 卸载插件 */
  async function uninstallPlugin(id: string) {
    try {
      await invoke('uninstall_plugin', { pluginId: id })
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

  function setSortOrder(id: string, order: number) {
    const plugin = plugins.value.find(p => p.id === id)
    if (plugin) plugin.sortOrder = order
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
    packPlugin,
    uninstallPlugin,
    toggleEnabled,
    setSortOrder,
  }
})
