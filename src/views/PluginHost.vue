<template>
  <div ref="containerRef" class="plugin-host" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { usePluginStore } from '@/stores/plugins'
import { usePluginWebview } from '@/composables/usePluginWebview'
import { resolvePluginUrl } from '@/services/pluginUrl'

const route = useRoute()
const pluginStore = usePluginStore()

const containerRef = ref<HTMLElement | null>(null)
const pluginView = usePluginWebview(containerRef)

const pluginId = computed(() => route.params.id as string)

const plugin = computed(() =>
  pluginStore.plugins.find(p => p.id === pluginId.value)
)

const pluginUrl = ref('')

onMounted(async () => {
  if (!pluginStore.plugins.length) {
    await pluginStore.loadPlugins()
  }

  await nextTick()

  if (plugin.value && (plugin.value.entryUrl || plugin.value.entryHtml)) {
    pluginUrl.value = await resolvePluginUrl(plugin.value.entryHtml, plugin.value.entryUrl ?? null)
    if (pluginUrl.value) {
      await pluginView.open(pluginId.value, pluginUrl.value, plugin.value.keepAlive ?? false)
    }
  }
})

// 离开插件页面时关闭当前前台子 WebView：
// 常驻(keepAlive)插件只隐藏保留运行，非常驻插件彻底关闭（下次进入重新加载）
onBeforeRouteLeave((to, from, next) => {
  if (plugin.value?.keepAlive) {
    pluginView.leave(pluginId.value)
  } else {
    pluginView.close(pluginId.value)
  }
  next()
})

watch([pluginId, plugin], async ([id, p]) => {
  if (p && (p.entryUrl || p.entryHtml)) {
    pluginUrl.value = await resolvePluginUrl(p.entryHtml, p.entryUrl ?? null)
    if (pluginUrl.value) {
      await pluginView.navigate(id, pluginUrl.value, p.keepAlive ?? false)
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
