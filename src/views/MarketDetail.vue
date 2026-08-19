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

      <!-- 简介 -->
      <section class="section">
        <h2 class="section-title">{{ $t('market.detail_desc') }}</h2>
        <p class="desc">{{ plugin.description || $t('home.no_desc') }}</p>
      </section>

      <!-- 详细信息 -->
      <section class="section">
        <h2 class="section-title">{{ $t('market.detail_info') }}</h2>
        <dl class="info-list">
          <div class="info-row">
            <dt>{{ $t('market.detail_id') }}</dt>
            <dd>{{ plugin.id }}</dd>
          </div>
          <div class="info-row">
            <dt>{{ $t('market.detail_version') }}</dt>
            <dd>v{{ plugin.version }}</dd>
          </div>
          <div class="info-row">
            <dt>{{ $t('market.detail_author') }}</dt>
            <dd>{{ plugin.author || '—' }}</dd>
          </div>
          <div class="info-row">
            <dt>{{ $t('market.detail_file') }}</dt>
            <dd>{{ plugin.file }}</dd>
          </div>
        </dl>
      </section>

      <!-- 占位：截图 / 更新日志 -->
      <section class="section">
        <h2 class="section-title">{{ $t('market.detail_media') }}</h2>
        <div class="placeholder">
          <SvgIcon name="image" :size="22" :style="{ color: 'var(--disabled-color)' }" />
          <span>{{ $t('market.detail_media_empty') }}</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
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

const installed = computed(() =>
  plugin.value ? pluginStore.plugins.some(p => p.id === plugin.value?.id) : false,
)

/** 市场版本严格高于已装版本 → 可升级 */
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

const iconUrl = computed(() => (plugin.value?.iconUrl ? marketUrl.value + plugin.value.iconUrl : ''))
const tags = computed<string[]>(() => {
  const t = plugin.value?.tag
  if (!t) return []
  return Array.isArray(t) ? t : [t]
})

async function load() {
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
  // 直接打开详情页（无历史）时回市场；否则正常返回上一页
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
  margin-bottom: 26px;

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

// —— 分区 ——
.section { margin-bottom: 26px; }
.section-title {
  margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-color);
  &::before { content: ''; display: inline-block; width: 3px; height: 14px; margin-right: 8px; border-radius: 2px; vertical-align: -2px; background: var(--accent-color); }
}

.desc {
  margin: 0; font-size: 14px; line-height: 1.7;
  color: color-mix(in srgb, var(--text-color) 82%, transparent);
  white-space: pre-wrap; word-break: break-word;
}

.info-list {
  margin: 0; border: 1px solid var(--line-color); border-radius: 12px; overflow: clip;
  .info-row {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 12px 16px; font-size: 13px;
    & + .info-row { border-top: 1px solid var(--line-color); }
    dt { color: var(--disabled-color); flex-shrink: 0; }
    dd { margin: 0; color: var(--text-color); word-break: break-all; text-align: right; }
  }
}

.placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 36px 0; border: 1px dashed var(--line-color); border-radius: 12px;
  font-size: 13px; color: var(--disabled-color);
}

// —— 状态 ——
.state-box {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 80px 0;
  .spinner {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid rgba(var(--accent-rgb), 0.2); border-top-color: var(--accent-color);
    animation: spin 0.8s linear infinite;
  }
}

// —— EmptyState 里的重试按钮 ——
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
