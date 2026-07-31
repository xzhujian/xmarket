<template>
  <div class="messages-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('message.title') }}</h2>

    <EmptyState v-if="!messages.length" icon="messages" :text="$t('message.empty')" />

    <div v-if="messages.length" class="space-y-2">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="message-item p-4 rounded-xl transition-all duration-200"
        :style="{
          background: 'var(--bg-setting-item)',
          border: '1px solid var(--line-color)',
        }"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--bg-hover-muted)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'var(--bg-setting-item)'"
      >
        <div class="flex items-center gap-2 mb-1">
          <SvgIcon name="bell" :size="16" :style="{ color: 'var(--accent-color)' }" />
          <span class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">{{ msg.title }}</span>
          <span class="text-xs ml-auto" :style="{ color: 'var(--disabled-color)' }">{{ msg.time }}</span>
        </div>
        <p class="text-sm ml-6" :style="{ color: 'var(--info-text-color)' }">{{ msg.content }}</p>
        <p class="text-xs ml-6 mt-1" :style="{ color: 'var(--accent-color)' }">{{ $t('message.from', { appName: msg.from }) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

const messages = ref([
  {
    title: '数据看板更新通知',
    content: '您的销售数据报表已生成，点击查看详情。',
    from: '数据看板',
    time: '10:30',
  },
  {
    title: 'AI 分析完成',
    content: '上个月的用户增长趋势分析已完成。',
    from: 'AI 助手',
    time: '昨天',
  },
])
</script>

<style scoped>
.message-item {
  --info-text-color: #202020;
}
html[data-theme='dark'] .message-item {
  --info-text-color: #eee;
}
</style>
