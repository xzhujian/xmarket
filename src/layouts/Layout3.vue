<template>
  <div class="layout-3 flex flex-col h-full">
    <!-- 顶部标签栏 -->
    <div class="tab-bar flex items-center px-2 h-11 border-b select-none" :style="{ background: 'var(--center-bg-color)', borderColor: 'var(--line-color)' }">
      <!-- 系统功能标签 -->
      <div class="flex items-center gap-0.5 mr-2">
        <button
          v-for="item in systemItems"
          :key="item.path"
          class="nav-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
          :class="{ active: currentRoute === item.path && !runtime.selectedPluginId }"
          :title="$t(item.label)"
          @click="navigate(item.path)"
        >
          <SvgIcon :name="item.icon" :size="18" />
        </button>
      </div>

      <!-- 分隔线 -->
      <div v-if="enabledPlugins.length" class="w-px h-5 mx-1" :style="{ background: 'var(--line-color)' }" />

      <!-- 插件标签 -->
      <div class="flex items-center gap-0.5 flex-1 overflow-auto">
        <div
          v-for="plugin in enabledPlugins"
          :key="plugin.id"
          class="plugin-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-sm whitespace-nowrap"
          :class="{ active: runtime.selectedPluginId === plugin.id }"
          @click="openPlugin(plugin)"
        >
          <img
            v-if="plugin.iconUrl"
            :src="plugin.iconUrl"
            :alt="plugin.name"
            class="plugin-ic"
            style="width: 16px; height: 16px"
          />
          <SvgIcon v-else name="package" :size="16" class="plugin-icon" />
          <span>{{ plugin.name }}</span>
          <span v-if="isRunning(plugin.id)" class="run-dot" title="运行中"></span>
          <span
            v-if="isRunning(plugin.id)"
            class="tab-close"
            title="关闭插件"
            @click.stop="closePlugin(plugin.id)"
          >✕</span>
        </div>
      </div>
    </div>

    <!-- 内容区（全宽） -->
    <main class="flex-1 overflow-auto p-4">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import { useRuntimeStore } from '@/stores/runtime'
import { usePluginOpen } from '@/composables/usePluginOpen'
import SvgIcon from '@/components/SvgIcon.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const pluginStore = usePluginStore()
const runtime = useRuntimeStore()
const { openPlugin } = usePluginOpen()

const currentRoute = computed(() => route.path)
const enabledPlugins = computed(() => pluginStore.enabledPlugins)

// 离开插件区（路由不再是 /plugin/*）时清掉导航选中，让系统项按路由正常高亮
watch(currentRoute, (p) => {
  if (!p.startsWith('/plugin/')) runtime.selectedPluginId = null
})

const isRunning = (id: string) => !!runtime.windows[id]

// 关闭运行中的插件：销毁 webview；若正处其页面则回到首页
function closePlugin(id: string) {
  runtime.closeWindow(id)
  if (route.path === `/plugin/${id}`) router.push('/')
}

const systemItems = [
  { path: '/', icon: 'home', label: 'nav.home' },
  { path: '/plugins', icon: 'layout', label: 'nav.plugins' },
  { path: '/messages', icon: 'messages', label: 'nav.messages' },
]

function navigate(path: string) {
  runtime.selectedPluginId = null
  router.push(path)
}
</script>

<style lang="scss" scoped>
.layout-3 {
  .nav-btn {
    color: var(--icon-color);
    background: transparent;
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
  .plugin-tab.active .plugin-icon {
    color: var(--text-active-color);
  }

  .plugin-ic {
    border-radius: 3px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .plugin-tab {
    color: var(--icon-color);
    background: transparent;
    transition: all 0.2s;
    &:hover {
      background: var(--bg-left-menu-hover);
    }
    &.active {
      color: var(--text-active-color);
      background: var(--bg-active-msg);
    }

    .run-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .tab-close {
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
  }
}
</style>
