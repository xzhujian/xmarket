<template>
  <div class="market-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('market.all_apps') }}</h2>

    <!-- 分类导航（静态占位） -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2" style="scrollbar-width: none;">
      <span
        class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-default transition-all"
        :style="{
          background: 'var(--accent-color)',
          color: '#fff',
        }"
      >全部</span>
      <span
        v-for="cat in categories"
        :key="cat"
        class="px-4 py-1.5 rounded-full text-sm whitespace-nowrap cursor-default transition-all"
        :style="{
          background: 'var(--bg-setting-item)',
          color: 'var(--disabled-color)',
          border: '1px solid var(--line-color)',
        }"
      >{{ cat }}</span>
    </div>

    <!-- 推荐插件（静态占位卡片） -->
    <div class="text-xs font-medium mb-3" :style="{ color: 'var(--disabled-color)' }">推荐插件</div>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))">
      <div
        v-for="(item, idx) in featured"
        :key="idx"
        class="rounded-xl p-4 transition-all duration-200"
        :style="{
          background: 'var(--bg-setting-item)',
          border: '1px solid var(--line-color)',
        }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            :style="{ background: item.color + '22', color: item.color }"
          >{{ item.emoji }}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm" :style="{ color: 'var(--text-color)' }">{{ item.name }}</div>
            <div class="text-xs mt-0.5" :style="{ color: 'var(--disabled-color)' }">{{ item.desc }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs" :style="{ color: 'var(--disabled-color)' }">v{{ item.version }}</span>
          <span
            class="text-xs px-3 py-1 rounded-full font-medium cursor-default"
            :style="{
              background: 'var(--accent-color)',
              color: '#fff',
              opacity: 0.6,
            }"
          >{{ item.status }}</span>
        </div>
      </div>
    </div>

    <!-- 即将上线 -->
    <div class="mt-8 text-center py-12 rounded-xl" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
      <div class="text-3xl mb-3">🚀</div>
      <div class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">更多插件即将上线</div>
      <div class="text-xs mt-1" :style="{ color: 'var(--disabled-color)' }">应用市场正在建设中，敬请期待</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const categories = ['工具', '主题', '开发', '游戏', '娱乐', '社交']

const featured = [
  { name: 'Markdown 编辑器', desc: '强大的 Markdown 编辑与预览工具', emoji: '📝', color: '#6366f1', version: '1.0.0', status: '即将上线' },
  { name: 'JSON 查看器', desc: '格式化与浏览 JSON 数据文件', emoji: '📋', color: '#22c55e', version: '0.9.0', status: '即将上线' },
  { name: '代码片段管理', desc: '保存与管理常用代码片段', emoji: '📦', color: '#f59e0b', version: '0.8.0', status: '即将上线' },
  { name: '图片压缩工具', desc: '批量压缩与优化图片文件', emoji: '🖼️', color: '#ec4899', version: '0.5.0', status: '即将上线' },
  { name: '定时任务', desc: '配置与管理定时执行的任务', emoji: '⏰', color: '#8b5cf6', version: '0.3.0', status: '即将上线' },
  { name: '网络抓包', desc: 'HTTP 请求拦截与调试工具', emoji: '🔍', color: '#ef4444', version: '0.1.0', status: '即将上线' },
]
</script>

<style scoped>
.market-page {
  -webkit-overflow-scrolling: touch;
}
</style>
