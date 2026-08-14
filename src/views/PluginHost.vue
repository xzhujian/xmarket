<template>
  <div ref="containerRef" class="plugin-host" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { usePluginStore } from '@/stores/plugins'
import { usePluginWebview } from '@/composables/usePluginWebview'
import { onEvent } from '@/services/ipc'
import { invoke } from '@tauri-apps/api/core'
import { useDebugStore } from '@/stores/debug'

const route = useRoute()
const router = useRouter()
const pluginStore = usePluginStore()
const debug = useDebugStore()

const containerRef = ref<HTMLElement | null>(null)
const pluginView = usePluginWebview(containerRef)

const pluginId = computed(() => route.params.id as string)

const plugin = computed(() =>
  pluginStore.plugins.find(p => p.id === pluginId.value)
)

const pluginUrl = ref('')
let unlistenExit: (() => void) | null = null

async function resolvePluginUrl(entryHtml: string): Promise<string> {
  try {
    const url = await invoke<string>('get_plugin_server_url', { entryHtml })
    debug.info(`[PluginHost] server URL → ${url}`)
    return url
  } catch (e) {
    debug.error(`[PluginHost] resolve URL failed: ${e}`)
    return ''
  }
}

onMounted(async () => {
  if (!pluginStore.plugins.length) {
    await pluginStore.loadPlugins()
  }

  await nextTick()

  if (plugin.value?.entryHtml) {
    pluginUrl.value = await resolvePluginUrl(plugin.value.entryHtml)
    if (pluginUrl.value) {
      await pluginView.open(pluginId.value, pluginUrl.value)
    }
  }

  // 订阅后端转发的插件退出通知（方案B：插件调命令→后端emit→主窗口收→调功能）
  onEvent<string>('plugin-exit', (pid) => {
    debug.info(`[PluginHost] 插件请求退出: ${pid}`)
    pluginView.close(pid)
    router.push('/my-apps')
  }).then((fn) => { unlistenExit = fn }).catch(() => {})
})

onUnmounted(() => {
  unlistenExit?.()
})

// 离开页面时隐藏当前前台子 WebView（不关闭，后续切换回来直接显示）
onBeforeRouteLeave((to, from, next) => {
  pluginView.hideActive()
  next()
})

watch([pluginId, plugin], async ([id, p]) => {
  if (p?.entryHtml) {
    pluginUrl.value = await resolvePluginUrl(p.entryHtml)
    if (pluginUrl.value) {
      await pluginView.navigate(id, pluginUrl.value)
    }
  }
})
</script>

<style scoped>
.plugin-host {
  /* 绝对定位铺满父级 main,确保子 Webview 覆盖整个主内容区(无视 p-4 内边距) */
  position: absolute;
  inset: 0;
}
</style>
