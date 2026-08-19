import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Plugins 页面 tab 状态。提升到 store 以跨页面切换保留——避免从详情返回时跳回「我的插件」 */
export const usePluginsUIStore = defineStore('pluginsUI', () => {
  const activeTab = ref(0)
  return { activeTab }
})
