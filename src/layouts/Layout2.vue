<template>
  <div class="layout-2 flex h-full">
    <!-- 左侧标准侧栏（分区） -->
    <div
      class="left-bar flex flex-col select-none"
      :style="{ background: 'var(--bg-left-menu)', width: '220px', minWidth: '220px' }"
    >
      <!-- 系统功能 -->
      <div class="px-3 pt-4 pb-2">
        <div class="text-xs font-medium px-3 mb-1.5" :style="{ color: 'var(--disabled-color)' }">{{ $t('layout.system') }}</div>
        <div class="flex flex-col gap-0.5">
          <button
            v-for="item in systemItems"
            :key="item.path"
            class="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm"
            :class="{ active: currentRoute === item.path }"
            @click="navigate(item.path)"
          >
            <SvgIcon :name="item.icon" :size="20" />
            <span>{{ $t(item.label) }}</span>
          </button>
        </div>
      </div>

      <!-- 我的插件（可滚动） -->
      <div class="flex-1 px-3 overflow-auto">
        <div class="text-xs font-medium px-3 mb-1.5" :style="{ color: 'var(--disabled-color)' }">{{ $t('layout.plugins') }}</div>
        <div v-if="enabledPlugins.length" class="flex flex-col gap-0.5">
          <button
            v-for="plugin in enabledPlugins"
            :key="plugin.id"
            class="nav-btn flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm"
            :class="{ active: currentRoute === `/plugin/${plugin.id}` }"
            @click="navigate(`/plugin/${plugin.id}`)"
          >
            <SvgIcon name="package" :size="20" :style="{ color: 'var(--accent-color)' }" />
            <span>{{ plugin.name }}</span>
          </button>
        </div>
        <div v-else class="px-3 py-2 text-xs" :style="{ color: 'var(--disabled-color)' }">
          {{ $t('layout.no_plugins') }}
        </div>
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
  { path: '/my-apps', icon: 'grid', label: 'nav.my_apps' },
  { path: '/messages', icon: 'messages', label: 'nav.messages' },
]

function navigate(path: string) {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.layout-2 {
  .left-bar {
    border-right: 1px solid var(--line-color);
  }

  .nav-btn {
    color: var(--text-color);
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
