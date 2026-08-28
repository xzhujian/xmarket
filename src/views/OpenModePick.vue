<template>
  <div class="pick-page">
    <button class="pick-back" @click="goBack">
      <SvgIcon name="chevron-left" :size="16" />
      <span>{{ $t('pluginOpenMode.back') }}</span>
    </button>

    <template v-if="plugin">
      <div class="pick-hero">
        <IconBox size="lg">
          <img v-if="plugin.iconUrl" :src="plugin.iconUrl" alt="" class="pick-icon" />
          <SvgIcon v-else name="package" :size="30" class="pick-cf-icon" />
        </IconBox>
        <div class="pick-info">
          <h2 class="pick-name">{{ plugin.name }}</h2>
          <p class="pick-desc">{{ plugin.description || $t('home.no_desc') }}</p>
          <div class="pick-meta">
            <span>v{{ plugin.version }}</span>
            <span v-if="plugin.author" class="dot">·</span>
            <span v-if="plugin.author">{{ plugin.author }}</span>
          </div>
        </div>
      </div>

      <p class="pick-subtitle">{{ $t('pluginOpenMode.subtitle', { name: plugin.name }) }}</p>

      <div class="pick-grid">
        <button
          v-for="opt in options"
          :key="opt.kind"
          class="pick-card"
          :data-kind="opt.kind"
          @click="open(opt.kind)"
        >
          <div class="pick-card-icon">
            <SvgIcon :name="opt.icon" :size="26" />
          </div>
          <div class="pick-card-title">{{ $t(opt.titleKey) }}</div>
          <div class="pick-card-desc">{{ $t(opt.descKey) }}</div>
        </button>
      </div>
    </template>

    <div v-else class="pick-empty">{{ $t('home.empty_title') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePluginStore } from '@/stores/plugins'
import { useRuntimeStore, type PluginWindowKind } from '@/stores/runtime'
import { resolvePluginUrl } from '@/services/pluginUrl'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'

const options: { kind: PluginWindowKind; icon: string; titleKey: string; descKey: string }[] = [
  { kind: 'inline', icon: 'panels', titleKey: 'pluginOpenMode.inline', descKey: 'pluginOpenMode.inline_desc' },
  { kind: 'window', icon: 'window', titleKey: 'pluginOpenMode.window', descKey: 'pluginOpenMode.window_desc' },
  { kind: 'fullscreen', icon: 'fullscreen', titleKey: 'pluginOpenMode.fullscreen', descKey: 'pluginOpenMode.fullscreen_desc' },
]

const route = useRoute()
const router = useRouter()
const pluginStore = usePluginStore()
const runtime = useRuntimeStore()

const pluginId = computed(() => route.params.id as string)
const plugin = computed(() => pluginStore.plugins.find(p => p.id === pluginId.value))

onMounted(async () => {
  if (!pluginStore.plugins.length) await pluginStore.loadPlugins()
})

async function open(kind: PluginWindowKind) {
  const p = plugin.value
  if (!p) return
  // 内嵌直接进插件宿主页（内部会自行解析入口 URL）
  if (kind === 'inline') {
    router.push(`/plugin/${p.id}`)
    return
  }
  const url = await resolvePluginUrl(p.entryHtml, p.entryUrl ?? null)
  if (!url) return
  await runtime.openWindow(p.id, url, p.keepAlive ?? false, kind, p.name)
}

function goBack() {
  router.back()
}
</script>

<style lang="scss" scoped>
.pick-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}

.pick-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  margin-bottom: 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--icon-color);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: var(--bg-left-menu-hover);
    color: var(--text-color);
  }
}

.pick-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  background: var(--bg-setting-item);
  border: 1px solid var(--line-color);

  .pick-icon {
    width: 34px;
    height: 34px;
    object-fit: contain;
    border-radius: 8px;
  }
  .pick-cf-icon {
    color: var(--accent-color);
  }
  .pick-info {
    min-width: 0;
    flex: 1;
  }
  .pick-name {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-color);
  }
  .pick-desc {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--disabled-color);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: clip;
  }
  .pick-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--disabled-color);
    .dot {
      color: var(--line-color);
    }
  }
}

.pick-subtitle {
  margin: 22px 0 14px;
  font-size: 13px;
  color: var(--disabled-color);
}

.pick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.pick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 26px 18px 22px;
  border-radius: 14px;
  background: var(--bg-setting-item);
  border: 1px solid var(--line-color);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px var(--box-shadow-color);
    border-color: color-mix(in srgb, var(--accent-color) 40%, transparent);
  }

  .pick-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    margin-bottom: 12px;
    border-radius: 14px;
    color: var(--accent-color);
    background: rgba(var(--accent-rgb), 0.12);
  }
  &[data-kind='window'] .pick-card-icon {
    color: #3b82f6;
    background: #3b82f622;
  }
  &[data-kind='fullscreen'] .pick-card-icon {
    color: #8b5cf6;
    background: #8b5cf622;
  }
  &:hover .pick-card-icon {
    background: rgba(var(--accent-rgb), 0.2);
  }
  &[data-kind='window']:hover .pick-card-icon {
    background: #3b82f633;
  }
  &[data-kind='fullscreen']:hover .pick-card-icon {
    background: #8b5cf633;
  }

  .pick-card-title {
    margin-bottom: 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-color);
  }
  .pick-card-desc {
    font-size: 12px;
    line-height: 1.5;
    color: var(--disabled-color);
  }
}
</style>