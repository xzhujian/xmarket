<template>
  <div class="market-panel">
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

    <!-- 空态 -->
    <EmptyState
      v-else-if="status === 'ok' && !list.length"
      icon="package"
      :text="$t('market.no_plugins')"
    />

    <!-- 列表 -->
    <div v-else class="ok">
      <div class="panel-head">
        <span class="head-count">{{ list.length }}</span>
        <span class="head-title">{{ $t('market.all_apps') }}</span>
      </div>

      <div class="grid">
        <div v-for="item in list" :key="item.id" class="plugin-card" @click="onDetails(item)">
          <div class="card-head">
            <div class="icon-wrap">
              <img
                v-if="item.iconUrl"
                :src="props.market.url + item.iconUrl"
                alt=""
                class="plugin-icon"
              />
              <SvgIcon v-else name="package" :size="22" :style="{ color: iconColor(item.id) }" />
            </div>

            <div class="head-mid">
              <h4 class="card-name">{{ item.name }}</h4>
              <div class="tags">
                <span v-for="(tag, i) in tags(item)" :key="i" class="tag">{{ tag }}</span>
              </div>
            </div>

            <button
              v-if="isUpgrade(item)"
              class="install-btn"
              :disabled="installingId === item.id"
              @click.stop="onInstall(item)"
            >
              <span v-if="installingId === item.id" class="btn-spinner" />
              <span v-else>{{ $t('common.upgrade') }}</span>
            </button>
            <button
              v-else-if="isInstalled(item.id)"
              class="install-btn installed"
              :title="$t('market.installed_tip')"
              disabled
            >
              ✓ {{ $t('common.installed') }}
            </button>
            <button v-else class="install-btn" :disabled="installingId === item.id" @click.stop="onInstall(item)">
              <span v-if="installingId === item.id" class="btn-spinner" />
              <span v-else>{{ $t('common.install') }}</span>
            </button>
          </div>

          <div class="card-meta">
            <span>v{{ item.version }}</span>
            <span v-if="item.author" class="dot">·</span>
            <span v-if="item.author" class="author">{{ item.author }}</span>
          </div>

          <p class="card-desc">{{ item.description || $t('home.no_desc') }}</p>

          <div class="card-details-link">
            <span>{{ $t('market.details') }}</span>
            <SvgIcon name="chevron-right" :size="13" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePluginStore } from '@/stores/plugins'
import { compareVersions } from '@/utils/version'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { MarketConfig } from '@/constants/markets'

interface MarketPlugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  file: string
  /** 市场服务器提供的图标相对路径（如 /plugins/<id>/icon），拼上 market.url 即可加载 */
  iconUrl?: string | null
  /** 市场服务器提供的下载相对路径（如 /plugins/<id>/download），拼上 market.url 即可下载 */
  downloadUrl?: string | null
  /** 插件标签（来自 manifest 的 tag 字段，后续定义；单个字符串或数组） */
  tag?: string | string[]
}

const props = defineProps<{ market: MarketConfig }>()
const pluginStore = usePluginStore()
const router = useRouter()
const { t } = useI18n()
const installingId = ref<string | null>(null)

type Status = 'loading' | 'error' | 'ok'
const status = ref<Status>('loading')
const list = ref<MarketPlugin[]>([])

async function load() {
  status.value = 'loading'
  try {
    const res = await fetch(`${props.market.url}/plugins`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    list.value = await res.json()
    status.value = 'ok'
  } catch (err) {
    console.error('拉取市场列表失败:', err)
    status.value = 'error'
  }
}

function isInstalled(id: string) {
  return pluginStore.plugins.some(p => p.id === id)
}

function installedVersion(id: string): string | null {
  const p = pluginStore.plugins.find(p => p.id === id)
  return p ? p.version : null
}

/** 市场版本严格高于已装版本 → 显示可升级 */
function isUpgrade(item: MarketPlugin) {
  const local = installedVersion(item.id)
  return local !== null && compareVersions(item.version, local) > 0
}

async function onInstall(item: MarketPlugin) {
  if (installingId.value) return
  if (isInstalled(item.id) && !isUpgrade(item)) return
  installingId.value = item.id
  try {
    await pluginStore.installMarketPlugin(props.market.url, item)
  } catch (err) {
    console.error('市场安装失败:', err)
    window.alert(`${item.name}：${t('market.install_failed')}`)
  } finally {
    installingId.value = null
  }
}

function onDetails(item: MarketPlugin) {
  // 跳转独立详情页，market url 走 query 传给页面去拉完整 manifest
  router.push({ name: 'market-detail', params: { id: item.id }, query: { url: props.market.url } })
}

// 标签直接来自 manifest 的 tag 字段（不自行生成），兼容字符串或数组
function tags(item: MarketPlugin): string[] {
  const t = item.tag
  if (!t) return []
  return Array.isArray(t) ? t : [t]
}

const palette = ['#13987f', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']
const iconColor = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

onMounted(load)
</script>

<style lang="scss" scoped>
.market-panel {
  // —— 加载态 ——
  .state-box {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 56px 0;
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

  // —— 顶部标题行 ——
  .panel-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
    .head-count {
      min-width: 24px; padding: 2px 9px; border-radius: 999px; text-align: center;
      font-size: 12px; font-weight: 600; background: rgba(var(--accent-rgb), 0.12); color: var(--accent-color);
    }
    .head-title { font-size: 14px; font-weight: 600; color: var(--text-color); }
  }

  // —— 卡片网格 ——
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
  .plugin-card {
    position: relative;
    display: flex; flex-direction: column;
    padding: 18px 18px 14px; border-radius: 16px;
    background: var(--bg-setting-item); border: 1px solid var(--line-color);
    overflow: clip; cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

    // 顶部渐变条：悬停时从中间向两侧展开（scaleX 由中心缩放）
    &::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent 5%, rgba(var(--accent-rgb), 0.45) 50%, transparent 95%);
      transform: scaleX(0); transform-origin: center;
      transition: transform 0.25s ease;
    }
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px var(--box-shadow-color);
      border-color: color-mix(in srgb, var(--accent-color) 35%, transparent);
      .card-details-link { color: var(--accent-color); }
      &::before { transform: scaleX(1); }
    }
  }

  // —— 卡片头部：图标 + 标题 + 安装按钮 ——
  .card-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
  .icon-wrap {
    width: 48px; height: 48px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px; background: var(--bg-icon-box);
    .plugin-icon { width: 100%; height: 100%; object-fit: contain; padding: 7px; border-radius: 12px; }
  }
  .head-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
  .card-name {
    margin: 0; font-size: 15px; font-weight: 600; line-height: 1.35;
    color: var(--text-color); word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: clip;
  }
  .card-meta {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--disabled-color);
    margin-bottom: 10px; .dot { color: var(--line-color); } .author { max-width: 120px; overflow: clip; text-overflow: ellipsis; white-space: nowrap; }
  }

  // —— 安装按钮（头部主操作） ——
  .install-btn {
    flex-shrink: 0; padding: 6px 16px; border-radius: 999px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    color: #fff; background: var(--accent-color); border: none;
    box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.28);
    transition: all 0.2s ease;
    &:hover:not(:disabled) { background: var(--accent-hover); }
    &:focus-visible { box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.4); }
    &:disabled { opacity: 0.6; cursor: default; }
    .btn-spinner {
      display: inline-block; width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.8s linear infinite; vertical-align: -2px;
    }
    &.installed {
      color: var(--disabled-color); background: var(--bg-icon-box);
      box-shadow: none; font-weight: 500; cursor: default;
    }
  }

  // —— 查看详情（弱化文字链接） ——
  .card-details-link {
    display: inline-flex; align-items: center; gap: 2px; align-self: flex-start;
    margin-top: 12px; font-size: 12px; color: var(--disabled-color);
    transition: color 0.2s ease;
  }

  // —— 类型标签（无标签时也保留占位，保证各卡片等高） ——
  .tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 20px; align-items: flex-start; }
  .tag {
    padding: 1px 8px; border-radius: 999px; font-size: 11px; line-height: 1.6;
    color: var(--accent-color); background: rgba(var(--accent-rgb), 0.1);
    border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  }

  // —— 描述 ——
  .card-desc {
    height: calc(13px * 1.55 * 3); margin: 0; font-size: 13px; line-height: 1.55;
    color: color-mix(in srgb, var(--text-color) 74%, transparent);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: clip;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
