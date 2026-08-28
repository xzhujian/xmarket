<template>
  <div class="home-page">
    <!-- 顶部问候横幅 -->
    <div class="hero">
      <div class="hero-info">
        <h1 class="greeting">{{ greeting }}，{{ $t('home.welcome_back') }}</h1>
        <h2 class="hero-title">{{ appStore.appTitle }}</h2>
        <div class="hero-date">
          <SvgIcon name="bell" :size="14" />
          <span>{{ dateText }}</span>
        </div>
      </div>
      <div class="hero-logo">
        <img :src="appStore.appIconSrc" alt="logo" class="hero-logo-img" />
      </div>
    </div>

    <!-- 我的插件 -->
    <template v-if="hasPlugins">
      <div class="section-head">
        <h3 class="section-title">{{ $t('home.my_apps') }}</h3>
        <span class="count">{{ plugins.length }}</span>
      </div>
      <div class="grid">
        <div
          v-for="(plugin, idx) in plugins"
          :key="plugin.id"
          class="plugin-card"
          @click="openPlugin(plugin)"
        >
          <div class="card-top">
            <IconBox size="md">
              <img v-if="plugin.iconUrl" :src="plugin.iconUrl" alt="" class="plugin-icon" />
              <SvgIcon v-else name="package" :size="26" :style="{ color: iconColor(idx) }" />
            </IconBox>
            <span v-if="plugin.hasBackend" class="badge">{{ $t('home.badge_native') }}</span>
          </div>
          <h4 class="card-name">{{ plugin.name }}</h4>
          <div class="card-meta">
            <span>v{{ plugin.version }}</span>
            <span v-if="plugin.author" class="dot">·</span>
            <span v-if="plugin.author" class="truncate">{{ plugin.author }}</span>
          </div>
          <p class="card-desc">{{ plugin.description || $t('home.no_desc') }}</p>
          <div class="card-footer">
            <span class="open">{{ $t('home.open') }} <SvgIcon name="chevron-right" :size="14" /></span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import { usePluginOpen } from '@/composables/usePluginOpen'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'

const { t, locale } = useI18n()
const appStore = useAppStore()
const pluginStore = usePluginStore()
const { openPlugin } = usePluginOpen()

const plugins = computed(() => pluginStore.enabledPlugins)
const hasPlugins = computed(() => plugins.value.length > 0)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return t('home.greet_dawn')
  if (h < 12) return t('home.greet_morning')
  if (h < 14) return t('home.greet_noon')
  if (h < 18) return t('home.greet_afternoon')
  return t('home.greet_evening')
})

// 日期用 Intl 按当前语言格式化，zh → "2026年8月16日星期日"，en → "Sunday, August 16, 2026"
const dateText = computed(() => {
  const l = locale.value === 'en-US' ? 'en-US' : 'zh-CN'
  return new Intl.DateTimeFormat(l, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
})

const palette = ['#13987f', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']
const iconColor = (idx: number) => palette[idx % palette.length]
</script>

<style lang="scss" scoped>
.home-page {
  padding: 24px 28px 40px;

  // —— 问候横幅 ——
  .hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 28px;
    margin-bottom: 18px;
    border-radius: 18px;
    overflow: clip;
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.16), rgba(var(--accent-rgb), 0.03) 60%);
    border: 1px solid color-mix(in srgb, var(--accent-color) 22%, transparent);

    .hero-info { position: relative; z-index: 1; }
    .greeting {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-color);
    }
    .hero-title {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--accent-color);
    }
    .hero-date {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(var(--accent-rgb), 0.12);
      font-size: 12px;
      color: var(--text-color);
    }
    .hero-logo {
      flex-shrink: 0;
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      background: var(--bg-setting-item);
      box-shadow: 0 6px 20px var(--box-shadow-color);
      .hero-logo-img { width: 44px; height: 44px; object-fit: contain; border-radius: 10px; }
    }
  }

  // —— 区块标题 ——
  .section-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
    .section-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-color); }
    .count {
      min-width: 22px; padding: 1px 8px; border-radius: 999px; text-align: center;
      font-size: 12px; background: rgba(var(--accent-rgb), 0.12); color: var(--accent-color);
    }
  }

  // —— 插件卡片 ——
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
  .plugin-card {
    display: flex; flex-direction: column; padding: 20px; border-radius: 14px;
    background: var(--bg-setting-item); border: 1px solid var(--line-color); cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px var(--box-shadow-color);
      border-color: color-mix(in srgb, var(--accent-color) 40%, transparent);
      .open { color: var(--accent-color); }
    }
  }
  .card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
  .plugin-icon { width: 26px; height: 26px; object-fit: contain; border-radius: 6px; }
  .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; background: #8b5cf622; color: #8b5cf6; }
  .card-name { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: var(--text-color); white-space: nowrap; overflow: clip; text-overflow: ellipsis; }
  .card-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--disabled-color); margin-bottom: 10px; .dot { color: var(--line-color); } .truncate { max-width: 60%; overflow: clip; text-overflow: ellipsis; white-space: nowrap; } }
  .card-desc { flex: 1; margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: var(--disabled-color); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: clip; }
  .card-footer { display: flex; justify-content: flex-end; padding-top: 10px; border-top: 1px solid var(--line-color); .open { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; color: var(--disabled-color); transition: color 0.2s ease; } }
}
</style>
