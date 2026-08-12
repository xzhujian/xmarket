<template>
  <div
    class="app-sidebar flex flex-col select-none overflow-hidden"
    :class="`sidebar-${style}`"
    :style="{ background: 'var(--bg-left-menu)' }"
  >
    <!-- Logo（可选：布局1显示在侧栏顶部） -->
    <div
      v-if="showLogo"
      class="logo-box flex items-center justify-center"
      :style="{ color: 'var(--accent-color)' }"
    >
      <BrandLogo :size="style === 'icon' ? 22 : 20" />
      <span v-if="style === 'row'" class="logo-text" :style="{ color: 'var(--text-color)' }">{{ appStore.appTitle }}</span>
    </div>

    <!-- 系统功能 -->
    <div class="section" :class="`section-${style}`">
      <div class="nav-list" :class="`list-${style}`">
        <button
          v-for="item in systemItems"
          :key="item.path"
          class="nav-btn"
          :class="[`btn-${style}`, { active: currentRoute === item.path }]"
          :title="style === 'icon' ? $t(item.label) : undefined"
          @click="navigate(item.path)"
        >
          <SvgIcon :name="item.icon" :size="iconSize" />
          <span v-if="style !== 'icon'" class="nav-label">{{ $t(item.label) }}</span>
        </button>
      </div>
    </div>

    <!-- 分隔线 + 已启用的插件 -->
    <template v-if="enabledPlugins.length">
      <div class="divider" :style="{ borderColor: 'var(--line-color)' }" />
      <div class="section plugins flex-1" :class="`section-${style}`">
        <div v-if="style === 'row'" class="section-title" :style="{ color: sectionTitleColor }">
          {{ $t('layout.plugins') }}
        </div>
        <div class="nav-list plugins-list" :class="`list-${style}`">
          <button
            v-for="plugin in enabledPlugins"
            :key="plugin.id"
            class="nav-btn"
            :class="[`btn-${style}`, { active: currentRoute === `/plugin/${plugin.id}` }]"
            :title="style === 'icon' ? plugin.name : undefined"
            @click="navigate(`/plugin/${plugin.id}`)"
          >
            <SvgIcon name="package" :size="iconSize" :style="{ color: 'var(--accent-color)' }" />
            <span v-if="style !== 'icon'" class="nav-label">{{ plugin.name }}</span>
          </button>
        </div>
      </div>
    </template>
    <div v-else-if="style === 'row'" class="px-3 py-2 text-xs" :style="{ color: 'var(--disabled-color)' }">
      {{ $t('layout.no_plugins') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import SvgIcon from '@/components/SvgIcon.vue'
import BrandLogo from '@/components/BrandLogo.vue'

withDefaults(defineProps<{ showLogo?: boolean }>(), { showLogo: false })

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const pluginStore = usePluginStore()

const style = computed(() => appStore.sidebarStyle)
const iconSize = computed(() => (style.value === 'icon' ? 22 : 20))
const currentRoute = computed(() => route.path)
const enabledPlugins = computed(() => pluginStore.enabledPlugins)

// 区块标题（系统功能/我的插件）：比禁用色更深，皮肤上更易读
const sectionTitleColor = computed(() =>
  appStore.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(24,24,28,0.55)',
)

const systemItems = [
  { path: '/', icon: 'home', label: 'nav.home' },
  { path: '/market', icon: 'market', label: 'nav.market' },
  { path: '/my-apps', icon: 'grid', label: 'nav.my_apps' },
  { path: '/messages', icon: 'messages', label: 'nav.messages' },
]

function navigate(path: string) {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.app-sidebar {
  border-right: 1px solid var(--line-color);

  // —— 左右风格（宽侧栏，图标+文字横向） ——
  &.sidebar-row {
    width: 220px;
    min-width: 220px;
    padding-top: 16px;

    .logo-box {
      height: 44px;
      justify-content: flex-start;
      gap: 8px;
      padding: 0 20px;
    }
    .logo-text {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }
    .section {
      padding: 0 12px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 500;
      padding: 0 8px;
      margin: 12px 0 6px;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .btn-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
    .plugins-list {
      padding-bottom: 8px;
    }
  }

  // —— 上下风格（中等侧栏，图标在上文字在下） ——
  &.sidebar-column {
    width: 88px;
    min-width: 88px;
    padding-top: 16px;

    .logo-box {
      height: 44px;
    }
    .section {
      padding-top: 6px;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .btn-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 64px;
      padding: 8px 4px;
      border-radius: 8px;
      .nav-label {
        font-size: 11px;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .plugins-list {
      padding-top: 2px;
    }
  }

  // —— 缩略风格（窄侧栏，仅图标） ——
  &.sidebar-icon {
    width: 64px;
    min-width: 64px;
    padding-top: 16px;

    .logo-box {
      height: 48px;
      margin-bottom: 4px;
    }
    .section {
      padding-top: 4px;
    }
    .nav-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }
  }

  .divider {
    border-top-width: 1px;
    border-top-style: solid;
    margin: 8px auto;
    flex-shrink: 0;
  }
  // 分隔线按导航结构自适应：
  // 宽侧栏导航是左对齐文字区块 → 通栏横线才能真正分隔两组
  // 窄侧栏导航是居中图标 → 居中短线段即可
  &.sidebar-row .divider { width: auto; margin: 8px 16px; }
  &.sidebar-column .divider { width: 24px; }
  &.sidebar-icon .divider { width: 16px; }

  .nav-btn {
    color: var(--text-color);
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: var(--bg-left-menu-hover);
    }
    &.active {
      color: var(--text-active-color);
      background: var(--bg-active-msg);
    }
  }
}
</style>
