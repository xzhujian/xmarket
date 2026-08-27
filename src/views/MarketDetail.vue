<template>
  <div class="detail-page">
    <!-- 顶部条 -->
    <div class="topbar">
      <button class="back-btn" @click="goBack">
        <SvgIcon name="chevron-left" :size="16" />
        <span>{{ $t('market.detail_back') }}</span>
      </button>
    </div>

    <!-- 加载态 -->
    <div v-if="status === 'loading'" class="state-box">
      <span class="spinner" />
      <span class="text-sm" :style="{ color: 'var(--disabled-color)' }">{{ $t('common.loading') }}</span>
    </div>

    <!-- 错误态 -->
    <EmptyState
      v-else-if="status === 'error'"
      icon="wrench"
      :text="$t('market.load_failed')"
    >
      <template #action>
        <button class="retry-btn" @click="load">{{ $t('common.refresh') }}</button>
      </template>
    </EmptyState>

    <template v-else-if="plugin">
      <!-- Hero 横幅 -->
      <div class="hero">
        <div class="hero-icon">
          <img v-if="iconUrl" :src="iconUrl" alt="" class="hero-img" />
          <SvgIcon v-else name="package" :size="34" :style="{ color: iconColor }" />
        </div>

        <div class="hero-mid">
          <h1 class="hero-name">{{ plugin.name }}</h1>
          <div class="hero-meta">
            <span>v{{ plugin.version }}</span>
            <span v-if="plugin.author" class="dot">·</span>
            <span v-if="plugin.author" class="author">{{ plugin.author }}</span>
            <span v-if="plugin.source" class="dot">·</span>
            <span v-if="plugin.source" class="source-badge">{{ plugin.source }}</span>
          </div>
          <div v-if="tags.length" class="tags">
            <span v-for="(t, i) in tags" :key="i" class="tag">{{ t }}</span>
          </div>
        </div>

        <button class="install-btn" :disabled="installing || (installed && !upgrade)" @click="onInstall">
          <span v-if="installing" class="btn-spinner" />
          <span v-else-if="upgrade">{{ $t('common.upgrade') }}</span>
          <span v-else-if="installed">✓ {{ $t('common.installed') }}</span>
          <span v-else>{{ $t('common.install') }}</span>
        </button>
      </div>

      <!-- Tab 栏 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: 简介 -->
      <div v-if="activeTab === 'intro'" class="tab-content">
        <p class="desc">{{ plugin.description || $t('home.no_desc') }}</p>
      </div>

      <!-- Tab: 详情 -->
      <div v-if="activeTab === 'detail'" class="tab-content">
        <div class="table-grid">
          <div class="table-row">
            <span class="table-label">{{ $t('market.detail_id') }}</span>
            <span class="table-value">{{ plugin.id }}</span>
          </div>
          <div class="table-row">
            <span class="table-label">{{ $t('market.detail_version') }}</span>
            <span class="table-value">v{{ plugin.version }}</span>
          </div>
          <div class="table-row">
            <span class="table-label">{{ $t('market.detail_author') }}</span>
            <span class="table-value">{{ plugin.author || '—' }}</span>
          </div>
          <div v-if="plugin.source" class="table-row">
            <span class="table-label">来源</span>
            <span class="table-value">{{ plugin.source }}</span>
          </div>
          <div v-if="plugin.openMode" class="table-row">
            <span class="table-label">打开方式</span>
            <span class="table-value">{{ plugin.openMode }}</span>
          </div>
          <div v-if="plugin.host" class="table-row">
            <span class="table-label">宿主版本</span>
            <span class="table-value">{{ plugin.host }}</span>
          </div>
          <div class="table-row">
            <span class="table-label">{{ $t('market.detail_file') }}</span>
            <span class="table-value break-all">{{ plugin.file }}</span>
          </div>
        </div>
      </div>

      <!-- Tab: 截图 -->
      <div v-if="activeTab === 'media'" class="tab-content">
        <div class="placeholder">
          <SvgIcon name="image" :size="22" :style="{ color: 'var(--disabled-color)' }" />
          <span>{{ $t('market.detail_media_empty') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePluginStore } from '@/stores/plugins'
import { compareVersions } from '@/utils/version'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

interface DetailPlugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  file: string
  iconUrl?: string | null
  downloadUrl?: string | null
  tag?: string | string[]
  source?: string | null
  openMode?: string
  host?: string
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const pluginStore = usePluginStore()

const marketUrl = computed(() => String(route.query.url || ''))
const id = computed(() => String(route.params.id || ''))

type Status = 'loading' | 'error' | 'ok'
const status = ref<Status>('loading')
const plugin = ref<DetailPlugin | null>(null)
const installing = ref(false)
const activeTab = ref('intro')

const tabs = computed(() => [
  { key: 'intro', label: t('market.tab_intro') },
  { key: 'detail', label: t('market.tab_detail') },
  { key: 'media', label: t('market.tab_media') },
])

const installed = computed(() =>
  plugin.value ? pluginStore.plugins.some(p => p.id === plugin.value?.id) : false,
)

const upgrade = computed(() => {
  const p = plugin.value
  if (!p) return false
  const local = pluginStore.plugins.find(x => x.id === p.id)
  return local ? compareVersions(p.version, local.version) > 0 : false
})

async function onInstall() {
  const p = plugin.value
  if (!p || installing.value) return
  if (installed.value && !upgrade.value) return
  installing.value = true
  try {
    await pluginStore.installMarketPlugin(marketUrl.value, p)
  } catch (err) {
    console.error('市场安装失败:', err)
    window.alert(`${p.name}：${t('market.install_failed')}`)
  } finally {
    installing.value = false
  }
}

const iconUrl = computed(() =>
  plugin.value?.iconUrl ? marketUrl.value + plugin.value.iconUrl : ''
)

const tags = computed<string[]>(() => {
  const t = plugin.value?.tag
  if (!t) return []
  return Array.isArray(t) ? t : [t]
})

async function load() {
  if (!marketUrl.value) {
    status.value = 'error'
    return
  }
  status.value = 'loading'
  try {
    const res = await fetch(`${marketUrl.value}/plugins/${id.value}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    plugin.value = await res.json()
    status.value = 'ok'
  } catch (err) {
    console.error('拉取插件详情失败:', err)
    status.value = 'error'
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/plugins')
}

const palette = ['#13987f', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']
const iconColor = computed(() => {
  const key = plugin.value?.id || ''
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
})

onMounted(load)
</script>

<style lang="scss" scoped>
.detail-page {
  padding: 24px 28px 40px;
  max-width: 780px;
  margin: 0 auto;
}

// —— 顶部条 ——
.topbar {
  display: flex; align-items: center; gap: 16px;
  padding: 4px 0 16px;
  .back-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 4px; border-radius: 6px;
    font-size: 13px; color: var(--text-color);
    background: transparent; border: none;
    cursor: pointer; transition: color 0.2s ease;
    &:hover { color: var(--accent-color); }
  }
}

// —— Hero 横幅 ——
.hero {
  display: flex; align-items: center; gap: 20px;
  padding: 26px 28px; border-radius: 18px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.12), rgba(var(--accent-rgb), 0.03));
  border: 1px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
  margin-bottom: 20px;

  .hero-icon {
    width: 84px; height: 84px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 20px; background: var(--bg-setting-item);
    box-shadow: 0 4px 16px var(--box-shadow-color);
    .hero-img { width: 100%; height: 100%; object-fit: contain; padding: 12px; border-radius: 20px; }
  }

  .hero-mid { flex: 1; min-width: 0; }
  .hero-name {
    margin: 0; font-size: 22px; font-weight: 700; line-height: 1.3;
    color: var(--text-color); word-break: break-word;
  }
  .hero-meta {
    display: flex; align-items: center; gap: 6px;
    margin-top: 6px; font-size: 13px; color: var(--disabled-color);
    .dot { color: var(--line-color); }
  }
  .source-badge {
    display: inline-block; padding: 1px 8px; border-radius: 999px;
    font-size: 11px; line-height: 1.6;
    color: var(--accent-color); background: rgba(var(--accent-rgb), 0.1);
    border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .tag {
    padding: 2px 10px; border-radius: 999px; font-size: 12px; line-height: 1.6;
    color: var(--accent-color); background: rgba(var(--accent-rgb), 0.1);
    border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  }

  .install-btn {
    flex-shrink: 0; padding: 10px 26px; border-radius: 999px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    color: #fff; background: var(--accent-color); border: none;
    box-shadow: 0 2px 10px rgba(var(--accent-rgb), 0.3);
    transition: all 0.2s ease;
    &:hover:not(:disabled) { background: var(--accent-hover); }
    &:active:not(:disabled) { transform: scale(0.97); }
    &:disabled { opacity: 0.6; cursor: default; }
    .btn-spinner {
      display: inline-block; width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.8s linear infinite; vertical-align: -2px;
    }
  }
}

// —— Tab 栏 ——
.tabs {
  display: flex; gap: 0; margin-bottom: 20px;
  border-bottom: 1px solid var(--line-color);
}
.tab-btn {
  flex: 0 0 auto; padding: 10px 20px;
  font-size: 14px; font-weight: 500;
  color: var(--disabled-color); background: transparent;
  border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all 0.2s ease;
  &:hover { color: var(--text-color); }
  &.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }
}

// —— Tab 内容 ——
.tab-content {
  min-height: 120px;
}

// —— 简介 ——
.desc {
  margin: 0; font-size: 14px; line-height: 1.7;
  color: color-mix(in srgb, var(--text-color) 82%, transparent);
  white-space: pre-wrap; word-break: break-word;
}

// —— 详情表格 ——
.table-grid {
  border: 1px solid var(--line-color); border-radius: 12px; overflow: clip;
}
.table-row {
  display: flex; align-items: center; justify-content: flex-start; gap: 20px;
  padding: 12px 16px; font-size: 13px;
  & + .table-row { border-top: 1px solid var(--line-color); }
}
.table-label {
  flex: 0 0 100px; color: var(--disabled-color); flex-shrink: 0;
}
.table-value {
  flex: 1; color: var(--text-color); word-break: break-all; text-align: left;
}

// —— 媒体占位 ——
.placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 36px 0; border: 1px dashed var(--line-color); border-radius: 12px;
  font-size: 13px; color: var(--disabled-color);
}

// —— 错误状态 ——
.state-box {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 80px 0;
  .spinner {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid rgba(var(--accent-rgb), 0.2); border-top-color: var(--accent-color);
    animation: spin 0.8s linear infinite;
  }
}
.retry-btn {
  margin-top: 16px;
  padding: 7px 20px; border-radius: 999px; font-size: 13px; cursor: pointer;
  color: var(--accent-color); background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  &:hover { background: var(--accent-color); color: #fff; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>