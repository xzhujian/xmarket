<template>
  <div class="plugins-page">
    <!-- 顶部 tab 导航：第一项「我的插件」，之后每配置一个市场多一项 -->
    <div
      class="tabs-bar flex items-center gap-1 border-b mb-4 select-none"
      :style="{ borderColor: 'var(--line-color)' }"
    >
      <button
        class="tab-btn"
        :class="{ active: activeTab === 0 }"
        @click="activeTab = 0"
      >
        {{ $t('market.my_apps') }}
      </button>
      <button
        v-for="(m, idx) in markets"
        :key="m.url"
        class="tab-btn"
        :class="{ active: activeTab === idx + 1 }"
        @click="activeTab = idx + 1"
      >
        {{ m.name }}
      </button>
    </div>

    <!-- 我的插件 -->
    <MyAppsPanel v-show="activeTab === 0" />

    <!-- 各市场占位 -->
    <MarketPanel
      v-for="(m, idx) in markets"
      v-show="activeTab === idx + 1"
      :key="m.url"
      :market="m"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import MyAppsPanel from '@/views/MyApps.vue'
import MarketPanel from '@/views/Market.vue'
import { useAppStore } from '@/stores/app'
import { usePluginsUIStore } from '@/stores/pluginsUI'

// activeTab 提升到 store：跨页面切换保留，从详情返回时停在原 tab
const pluginsUI = usePluginsUIStore()
const { activeTab } = storeToRefs(pluginsUI)
// 市场列表由设置中配置（名称 + 地址），默认空，多市场各占一个 tab
const { markets } = storeToRefs(useAppStore())
</script>

<style lang="scss" scoped>
.plugins-page {
  padding: 24px 28px 40px;

  .tabs-bar {
    gap: 4px;
  }

  .tab-btn {
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--disabled-color);
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: var(--bg-left-menu-hover);
      color: var(--text-color);
    }
    &.active {
      color: var(--text-active-color);
      background: var(--bg-active-msg);
      font-weight: 600;
    }
  }
}
</style>
