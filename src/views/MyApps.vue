<template>
  <div class="my-apps-page">
    <!-- 标题栏 + 操作按钮 -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-color)' }">{{ $t('market.my_apps') }}</h2>
      <div class="flex items-center gap-2">
        <TButton variant="text" icon="refresh" :icon-size="18" @click="loadPlugins" :title="$t('common.refresh')" />
        <TButton variant="accent" @click="selectZipFile">
          <span class="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>安装插件</span>
          </span>
        </TButton>
      </div>
    </div>

    <!-- 安装状态提示 -->
    <div v-if="installMessage" class="mb-3 px-4 py-2 rounded-lg text-sm" :class="installMessageType === 'success' ? 'msg-success' : 'msg-error'">
      {{ installMessage }}
    </div>

    <!-- 空状态 -->
    <EmptyState v-if="!pluginStore.plugins.length && !loading" icon="package" :text="$t('market.no_my_plugins')" />

    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <span class="text-sm" :style="{ color: 'var(--disabled-color)' }">正在扫描插件...</span>
    </div>

    <!-- 插件列表 -->
    <div v-if="pluginStore.plugins.length" class="space-y-3">
      <div
        v-for="plugin in sortedPlugins"
        :key="plugin.id"
        class="plugin-item flex items-center justify-between p-4 rounded-xl transition-all duration-200"
        :style="{
          background: 'var(--bg-setting-item)',
          border: '1px solid var(--line-color)',
          opacity: plugin.enabled ? 1 : 0.5,
        }"
      >
        <div class="flex items-center gap-3">
          <IconBox size="sm">
            <SvgIcon name="package" :size="20" :style="{ color: 'var(--accent-color)' }" />
          </IconBox>
          <div>
            <h3 class="font-medium" :style="{ color: 'var(--text-color)' }">{{ plugin.name }}</h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs" :style="{ color: 'var(--disabled-color)' }">v{{ plugin.version }}</span>
              <span v-if="plugin.author" class="text-xs" :style="{ color: 'var(--disabled-color)' }">by {{ plugin.author }}</span>
              <span v-if="plugin.hasBackend" class="text-xs px-1.5 py-0.5 rounded" style="background: #8b5cf622; color: #8b5cf6">含原生后端</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <TButton variant="text" icon="download" :title="$t('market.pack')" @click="packPlugin(plugin)">
            打包
          </TButton>
          <TButton
            :variant="plugin.enabled ? 'outline' : 'accent'"
            @click="pluginStore.toggleEnabled(plugin.id)"
          >
            {{ plugin.enabled ? $t('common.disable') : $t('common.enable') }}
          </TButton>
          <TButton variant="text" style="color: #ef4444" @click="confirmUninstall(plugin)">
            卸载
          </TButton>
        </div>
      </div>
    </div>

    <!-- 卸载确认弹窗 -->
    <div v-if="uninstallTarget" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.4)">
      <div class="rounded-xl p-6 w-80" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
        <h3 class="font-semibold mb-2" :style="{ color: 'var(--text-color)' }">确认卸载</h3>
        <p class="text-sm mb-4" :style="{ color: 'var(--disabled-color)' }">
          确定要卸载 <strong :style="{ color: 'var(--text-color)' }">{{ uninstallTarget.name }}</strong> 吗？<br>
          此操作将删除插件文件，不可恢复。
        </p>
        <div class="flex justify-end gap-2">
          <TButton variant="outline" @click="uninstallTarget = null">取消</TButton>
          <TButton variant="accent" style="background: #ef4444" @click="doUninstall">确认卸载</TButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePluginStore } from '@/stores/plugins'
import type { PluginItem } from '@/stores/plugins'
import { open, save } from '@tauri-apps/plugin-dialog'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import TButton from '@/components/form/TButton.vue'

const pluginStore = usePluginStore()
const installMessage = ref('')
const installMessageType = ref<'success' | 'error'>('success')
const loading = ref(false)
const uninstallTarget = ref<PluginItem | null>(null)

onMounted(() => {
  loadPlugins()
})

const sortedPlugins = computed(() =>
  [...pluginStore.plugins].sort((a, b) => a.sortOrder - b.sortOrder)
)

async function loadPlugins() {
  loading.value = true
  try {
    await pluginStore.loadPlugins()
  } finally {
    loading.value = false
  }
}

async function selectZipFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: '插件包', extensions: ['zip'] }],
    })
    if (!selected) return

    installMessage.value = '正在安装...'
    installMessageType.value = 'success'

    await pluginStore.installPlugin(selected as string)

    installMessage.value = '插件安装成功 ✓'
    installMessageType.value = 'success'
    setTimeout(() => { installMessage.value = '' }, 3000)
  } catch (err: any) {
    installMessage.value = `安装失败: ${err?.message || err}`
    installMessageType.value = 'error'
  }
}

async function packPlugin(plugin: PluginItem) {
  try {
    const savePath = await save({
      defaultPath: `${plugin.id}-${plugin.version}.zip`,
      filters: [{ name: '插件包', extensions: ['zip'] }],
    })
    if (!savePath) return

    const result = await pluginStore.packPlugin(plugin.id, savePath)
    console.log('打包成功:', result)
  } catch (err) {
    console.error('打包失败:', err)
  }
}

function confirmUninstall(plugin: PluginItem) {
  uninstallTarget.value = plugin
}

async function doUninstall() {
  if (!uninstallTarget.value) return
  const plugin = uninstallTarget.value
  uninstallTarget.value = null

  try {
    await pluginStore.uninstallPlugin(plugin.id)
    installMessage.value = `插件「${plugin.name}」已卸载`
    installMessageType.value = 'success'
    setTimeout(() => { installMessage.value = '' }, 3000)
  } catch (err: any) {
    installMessage.value = `卸载失败: ${err?.message || err}`
    installMessageType.value = 'error'
  }
}
</script>

<style scoped>
.msg-success {
  background: #22c55e22;
  color: #22c55e;
  border: 1px solid #22c55e44;
}

.msg-error {
  background: #ef444422;
  color: #ef4444;
  border: 1px solid #ef444444;
}
</style>
