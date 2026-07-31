import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PluginItem {
  id: string
  name: string
  version: string
  icon: string
  enabled: boolean
  sortOrder: number
  isDefaultPage: boolean
  showOnHome: boolean
  entryHtml?: string
  full?: boolean
}

export const usePluginStore = defineStore('plugin', () => {
  const plugins = ref<PluginItem[]>([])

  function toggleEnabled(id: string) {
    const plugin = plugins.value.find(p => p.id === id)
    if (plugin) plugin.enabled = !plugin.enabled
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
    toggleEnabled,
    setSortOrder,
  }
})
