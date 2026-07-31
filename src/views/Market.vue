<template>
  <div class="market-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('market.all_apps') }}</h2>

    <div class="space-y-3">
      <div
        v-for="app in availableApps"
        :key="app.id"
        class="app-item flex items-center justify-between p-4 rounded-xl transition-all duration-200"
        :style="{
          background: 'var(--bg-setting-item)',
          border: '1px solid var(--line-color)',
        }"
        @mouseenter="($event.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px var(--box-shadow-color)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.boxShadow = 'none'"
      >
        <div class="flex items-center gap-3">
          <IconBox size="sm">
            <SvgIcon :name="app.icon" :size="22" :style="{ color: 'var(--accent-color)' }" />
          </IconBox>
          <div>
            <h3 class="font-medium" :style="{ color: 'var(--text-color)' }">{{ app.name }}</h3>
            <p class="text-xs mt-0.5" :style="{ color: 'var(--disabled-color)' }">{{ app.description }}</p>
          </div>
        </div>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
          :disabled="app.installed"
          :style="{
            background: app.installed ? 'var(--button-bg-color)' : 'var(--accent-color)',
            color: app.installed ? 'var(--disabled-color)' : '#fff',
            cursor: app.installed ? 'not-allowed' : 'pointer',
          }"
          @mouseenter="!app.installed && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
          @mouseleave="!app.installed && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-color)')"
        >
          <SvgIcon :name="app.installed ? 'check' : 'download'" :size="16" />
          {{ app.installed ? $t('common.installed') : $t('common.download') }}
        </button>
      </div>
    </div>

    <EmptyState icon="market" :text="$t('market.no_plugins')" />
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'
import EmptyState from '@/components/EmptyState.vue'

const availableApps = [
  {
    id: 'com.example.data-dashboard',
    name: '数据看板',
    icon: 'dashboard',
    description: '实时数据可视化分析工具',
    installed: false,
  },
  {
    id: 'com.example.file-tools',
    name: '文件工具',
    icon: 'folder',
    description: '文件批量处理与管理',
    installed: true,
  },
  {
    id: 'com.example.ai-assistant',
    name: 'AI 助手',
    icon: 'cpu',
    description: '智能对话与内容生成',
    installed: false,
  },
]
</script>
