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
          :class="{ active: currentRoute === item.path }"
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
        <button
          v-for="plugin in enabledPlugins"
          :key="plugin.id"
          class="nav-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-sm whitespace-nowrap"
          :class="{ active: currentRoute === `/plugin/${plugin.id}` }"
          @click="navigate(`/plugin/${plugin.id}`)"
        >
          <SvgIcon name="package" :size="16" :style="{ color: 'var(--accent-color)' }" />
          <span>{{ plugin.name }}</span>
        </button>
      </div>

      <!-- 右侧操作区：亮暗切换 / 消息 / 设置 / 关于 -->
      <div class="flex items-center gap-0.5 ml-2">
        <button
          class="nav-btn flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
          :title="appStore.isDark ? $t('theme.light') : $t('theme.dark')"
          @click="appStore.isDark = !appStore.isDark"
        >
          <SvgIcon :name="appStore.isDark ? 'sun' : 'moon'" :size="18" />
        </button>
        <button
          class="nav-btn flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
          :class="{ active: currentRoute === '/messages' }"
          :title="$t('nav.messages')"
          @click="navigate('/messages')"
        >
          <SvgIcon name="messages" :size="18" />
        </button>
        <button
          class="nav-btn flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
          :class="{ active: currentRoute === '/settings' }"
          :title="$t('nav.settings')"
          @click="navigate('/settings')"
        >
          <SvgIcon name="settings" :size="18" />
        </button>
        <button
          class="nav-btn flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
          :class="{ active: currentRoute === '/about' }"
          :title="$t('nav.about')"
          @click="navigate('/about')"
        >
          <SvgIcon name="about" :size="18" />
        </button>
      </div>
    </div>

    <!-- 内容区（全宽） -->
    <main class="flex-1 overflow-auto p-4">
      <router-view />
    </main>
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
  { path: '/my-apps', icon: 'grid', label: 'nav.my_apps' },
]

function navigate(path: string) {
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
}
</style>
