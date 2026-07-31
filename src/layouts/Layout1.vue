<template>
  <div class="layout-1 flex h-full">
    <!-- 左侧精简图标侧栏 -->
    <div
      class="left-bar flex flex-col items-center py-3 select-none"
      :style="{ background: 'var(--bg-left-menu)', width: '64px', minWidth: '64px' }"
    >
      <!-- 系统功能 -->
      <div class="flex flex-col items-center gap-2">
        <button
          v-for="item in systemItems"
          :key="item.path"
          class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
          :class="{ active: currentRoute === item.path }"
          :title="$t(item.label)"
          @click="navigate(item.path)"
        >
          <SvgIcon :name="item.icon" :size="22" />
        </button>
      </div>

      <!-- 分隔线 + 已启用的插件 -->
      <template v-if="enabledPlugins.length">
        <div class="w-6 border-t my-3" :style="{ borderColor: 'var(--line-color)' }" />
        <div class="flex flex-col items-center gap-2 flex-1 overflow-auto py-1">
          <button
            v-for="plugin in enabledPlugins"
            :key="plugin.id"
            class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
            :title="plugin.name"
          >
            <SvgIcon name="package" :size="20" :style="{ color: 'var(--accent-color)' }" />
          </button>
        </div>
      </template>

      <!-- 底部工具栏：亮暗切换 / 消息 / 设置 / 关于 -->
      <div class="mt-auto flex flex-col items-center gap-2">
        <button
          class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
          :title="appStore.isDark ? $t('theme.light') : $t('theme.dark')"
          @click="appStore.isDark = !appStore.isDark"
        >
          <SvgIcon :name="appStore.isDark ? 'sun' : 'moon'" :size="22" />
        </button>
        <button
          class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
          :class="{ active: currentRoute === '/messages' }"
          :title="$t('nav.messages')"
          @click="navigate('/messages')"
        >
          <SvgIcon name="messages" :size="22" />
        </button>
        <button
          class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
          :class="{ active: currentRoute === '/settings' }"
          :title="$t('nav.settings')"
          @click="navigate('/settings')"
        >
          <SvgIcon name="settings" :size="22" />
        </button>
        <button
          class="nav-btn flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
          :class="{ active: currentRoute === '/about' }"
          :title="$t('nav.about')"
          @click="navigate('/about')"
        >
          <SvgIcon name="about" :size="22" />
        </button>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <main class="flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePluginStore } from '@/stores/plugins'
import SvgIcon from '@/components/SvgIcon.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const pluginStore = usePluginStore()

const currentRoute = computed(() => route.path)
const enabledPlugins = computed(() => pluginStore.enabledPlugins)

const systemItems = [
  { path: '/', icon: 'home', label: 'nav.home' },
  { path: '/market', icon: 'market', label: 'nav.market' },
]

function navigate(path: string) {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.layout-1 {
  .left-bar {
    border-right: 1px solid var(--line-color);
  }

  .nav-btn {
    color: var(--icon-color);
    background: transparent;
    transition: all 0.2s;
    &:hover {
      background: var(--bg-left-menu-hover);
    }
    &.active {
      color: #fff;
      background: var(--bg-active-msg);
    }
  }
}
</style>
