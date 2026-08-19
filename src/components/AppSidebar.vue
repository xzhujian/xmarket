<template>
  <div
    class="app-sidebar flex flex-col select-none overflow-hidden"
    :class="[`sidebar-${style}`, { 'with-logo': showLogo }]"
    :style="{ background: 'var(--bg-left-menu)' }"
  >
    <!-- Logo（可选：布局1显示在侧栏顶部） -->
    <div
      v-if="showLogo"
      class="logo-box flex items-center justify-center"
      :style="{ color: 'var(--accent-color)' }"
    >
      <BrandLogo :size="logoSize" />
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
            <span
              class="plugin-icon-wrap"
              :style="{ width: iconSize + 'px', height: iconSize + 'px' }"
            >
              <img
                v-if="plugin.iconUrl"
                :src="plugin.iconUrl"
                :alt="plugin.name"
                class="plugin-ic"
                :style="{ width: iconSize + 'px', height: iconSize + 'px' }"
              />
              <SvgIcon v-else name="package" :size="iconSize" class="plugin-icon" />
              <!-- 缩略/上下风格：运行状态用图标右下角徽章圆点（叠加不占布局，避免按钮开关时高度跳动） -->
              <span v-if="isRunning(plugin.id) && style !== 'row'" class="run-badge" title="运行中"></span>
            </span>
            <!-- 缩略/上下风格：悬停时按钮背景框右上角小 ✕ 关闭角标；主图标仍可点击返回插件 -->
            <span
              v-if="isRunning(plugin.id) && style !== 'row'"
              class="plugin-close-badge"
              title="关闭插件"
              @click.stop="closePlugin(plugin.id)"
            >
              ✕
            </span>
            <span v-if="style !== 'icon'" class="nav-label">{{ plugin.name }}</span>
            <span v-if="isRunning(plugin.id) && style === 'row'" class="run-dot" title="运行中"></span>
            <span
              v-if="isRunning(plugin.id) && style === 'row'"
              class="plugin-close"
              title="关闭插件"
              @click.stop="closePlugin(plugin.id)"
            >✕</span>
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
import { useRuntimeStore } from '@/stores/runtime'
import SvgIcon from '@/components/SvgIcon.vue'
import BrandLogo from '@/components/BrandLogo.vue'

withDefaults(defineProps<{ showLogo?: boolean }>(), { showLogo: false })

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const pluginStore = usePluginStore()
const runtime = useRuntimeStore()

const isRunning = (id: string) => !!runtime.windows[id]

// 关闭运行中的插件：销毁 webview；若正处其页面则回到首页
function closePlugin(id: string) {
  runtime.closeWindow(id)
  if (route.path === `/plugin/${id}`) router.push('/')
}

const style = computed(() => appStore.sidebarStyle)
const iconSize = computed(() => (style.value === 'icon' ? 22 : 20))
// 上下风格（窄侧栏、图标在上）logo 居中显示，放大更协调
const logoSize = computed(() => {
  if (style.value === 'column') return 28
  if (style.value === 'icon') return 22
  return 20
})
const currentRoute = computed(() => route.path)
const enabledPlugins = computed(() => pluginStore.enabledPlugins)

// 区块标题（系统功能/我的插件）：比禁用色更深，皮肤上更易读
const sectionTitleColor = computed(() =>
  appStore.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(24,24,28,0.55)',
)

const systemItems = [
  { path: '/', icon: 'home', label: 'nav.home' },
  { path: '/plugins', icon: 'layout', label: 'nav.plugins' },
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
    position: relative;
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

  .plugin-icon {
    color: var(--accent-color);
  }
  .nav-btn.active .plugin-icon {
    color: var(--text-active-color);
  }

  .plugin-ic {
    border-radius: 4px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .plugin-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  // 缩略/上下风格共用：运行状态徽章——图标右下角小圆点（带侧栏底色描边，形成角标感）。
  // 叠加在图标上，不占布局空间，保证按钮开关状态高度一致。
  .run-badge {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    border: 2px solid var(--bg-left-menu);
    box-sizing: content-box;
  }
  // 缩略/上下风格共用：悬停时按钮背景框右上角小 ✕ 关闭角标（默认隐藏）。
  // 用半透明黑底 + 白 ✕，不用主题色/写死的红，避免与主题选中态撞色；
  // 黑白加透明在深浅主题下都通用。
  // 点击关闭（@click.stop 阻止跳转），主图标区域照常可点击返回插件。
  .plugin-close-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    display: none;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }
  .nav-btn:hover .plugin-close-badge {
    display: inline-flex;
  }

  .run-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
  }
  .plugin-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    font-size: 11px;
    line-height: 1;
    color: var(--disabled-color);
    flex-shrink: 0;
    &:hover {
      background: var(--bg-hover-muted);
      color: var(--text-color);
    }
  }
  &.sidebar-row .plugin-close {
    margin-left: auto;
  }

  // 贯通侧栏（布局1）：Logo 在侧栏顶部，去掉顶部留白，与右侧标题栏贴齐
  &.with-logo {
    padding-top: 0;
  }
}
</style>
