<template>
  <div ref="containerRef" class="plugin-host" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { usePluginStore } from '@/stores/plugins'
import { useDebugStore } from '@/stores/debug'
import { usePluginWebview } from '@/composables/usePluginWebview'
import { convertFileSrc } from '@tauri-apps/api/core'

const route = useRoute()
const pluginStore = usePluginStore()
const debugStore = useDebugStore()

const containerRef = ref<HTMLElement | null>(null)
const pluginView = usePluginWebview(containerRef)

const pluginId = computed(() => route.params.id as string)

const plugin = computed(() =>
  pluginStore.plugins.find(p => p.id === pluginId.value)
)

const pluginUrl = computed(() => {
  if (!plugin.value?.entryHtml) return ''
  const cleanPath = plugin.value.entryHtml.replace(/^\\\\\?\\/, '')
  return convertFileSrc(cleanPath)
})

onMounted(async () => {
  if (!pluginStore.plugins.length) {
    await pluginStore.loadPlugins()
  }

  await nextTick()

  if (plugin.value && pluginUrl.value) {
    debugStore.info(`加载插件: ${plugin.value.name}`)
    await pluginView.open(pluginUrl.value)
  } else {
    debugStore.warn(`插件未找到: ${pluginId.value}`)
  }
})

// 离开页面时隐藏子 WebView（不关闭，后续切换回来直接显示）
onBeforeRouteLeave((to, from, next) => {
  pluginView.hide()
  next()
})

watch([pluginId, plugin], async ([id, p]) => {
  if (p && pluginUrl.value) {
    debugStore.info(`切换插件: ${p.name}`)
    await pluginView.navigate(pluginUrl.value)
  }
})
</script>

<style scoped>
.plugin-host {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
