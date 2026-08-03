<template>
  <div class="market-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('market.all_apps') }}</h2>

    <!-- 本地安装 -->
    <Card title="安装插件">
      <div class="flex items-center gap-3">
        <button
          class="install-btn flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          :style="{
            background: 'var(--accent-color)',
            color: '#fff',
          }"
          @click="selectZipFile"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          选择 .zip 文件
        </button>
        <span v-if="installing" class="text-sm" :style="{ color: 'var(--disabled-color)' }">
          正在安装...
        </span>
        <span v-if="installSuccess" class="text-sm" style="color: #22c55e">
          安装成功 ✓
        </span>
      </div>
    </Card>

    <!-- 已安装插件列表 -->
    <Card title="已安装的插件">
      <div class="space-y-3">
        <div
          v-for="plugin in pluginStore.plugins"
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
              <p class="text-xs mt-0.5" :style="{ color: 'var(--disabled-color)' }">{{ plugin.version }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <TButton variant="outline" icon="download" @click="packPlugin(plugin)">
              打包
            </TButton>
            <TButton
              :variant="plugin.enabled ? 'outline' : 'accent'"
              @click="pluginStore.toggleEnabled(plugin.id)"
            >
              {{ plugin.enabled ? $t('common.disable') : $t('common.enable') }}
            </TButton>
          </div>
        </div>
      </div>
      <EmptyState v-if="!pluginStore.plugins.length" icon="package" text="暂无插件，请安装" />
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePluginStore } from '@/stores/plugins'
import type { PluginItem } from '@/stores/plugins'
import { open, save } from '@tauri-apps/plugin-dialog'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'
import Card from '@/components/Card.vue'
import EmptyState from '@/components/EmptyState.vue'
import TButton from '@/components/form/TButton.vue'

const pluginStore = usePluginStore()

const installing = ref(false)
const installSuccess = ref(false)

onMounted(() => {
  pluginStore.loadPlugins()
})

async function selectZipFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: '插件包', extensions: ['zip'] }],
    })
    if (!selected) return

    installing.value = true
    installSuccess.value = false

    await pluginStore.installPlugin(selected as string)

    installSuccess.value = true
    setTimeout(() => { installSuccess.value = false }, 3000)
  } catch (err) {
    console.error('安装失败:', err)
  } finally {
    installing.value = false
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
</script>

<style scoped>
.install-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.install-btn:active {
  transform: translateY(0);
}
</style>
