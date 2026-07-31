<template>
  <div class="debug-page">
    <div class="max-w-lg mx-auto space-y-4">
      <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-color)' }">调试面板</h2>
      <Card title="环境信息">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-1.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
            <span :style="{ color: 'var(--disabled-color)' }">模式</span>
            <span :style="{ color: 'var(--text-color)' }">{{ isDev ? '开发' : '生产' }}</span>
          </div>
          <div class="flex justify-between py-1.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
            <span :style="{ color: 'var(--disabled-color)' }">路由</span>
            <span :style="{ color: 'var(--text-color)' }">{{ route.path }}</span>
          </div>
          <div class="flex justify-between py-1.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
            <span :style="{ color: 'var(--disabled-color)' }">User Agent</span>
            <span class="text-xs text-right" :style="{ color: 'var(--text-color)', maxWidth: '250px', wordBreak: 'break-all' }">{{ userAgent }}</span>
          </div>
          <div class="flex justify-between py-1.5">
            <span :style="{ color: 'var(--disabled-color)' }">窗口大小</span>
            <span :style="{ color: 'var(--text-color)' }">{{ windowWidth }} × {{ windowHeight }}</span>
          </div>
        </div>
      </Card>

      <Card title="图标集 (lucide-vue-next)">
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))">
          <div
            v-for="icon in iconList"
            :key="icon"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all hover:scale-105"
            :style="{ background: 'var(--bg-color)', color: 'var(--text-color)' }"
          >
            <SvgIcon :name="icon" :size="24" />
            <span class="text-xs text-center break-all leading-tight" :style="{ color: 'var(--disabled-color)' }">{{ icon }}</span>
          </div>
        </div>
      </Card>

      <Card title="控制台">
        <template #header>
          <button
            v-if="debugStore.hasLogs"
            class="text-xs px-2 py-1 rounded transition-all"
            :style="{ background: 'var(--button-bg-color)', color: 'var(--text-color)' }"
            @click="debugStore.clear()"
          >
            清空
          </button>
        </template>
        <div
          class="p-3 rounded-lg text-xs font-mono overflow-auto max-h-56 space-y-1"
          :style="{ background: appStore.isDark ? '#111' : '#f5f5f5' }"
        >
          <div v-if="!debugStore.hasLogs" :style="{ color: 'var(--disabled-color)' }">暂无日志</div>
          <div
            v-for="log in debugStore.logs"
            :key="log.id"
            class="flex gap-2 leading-relaxed"
          >
            <!-- 层级标签 [INFO] [WARN] [ERROR] [STATE] -->
            <span
              class="flex-shrink-0 font-bold"
              :style="{ color: levelColor(log.level) }"
            >{{ levelLabel(log.level) }}</span>
            <!-- 时间戳 -->
            <span class="flex-shrink-0" :style="{ color: 'var(--disabled-color)' }">{{ log.time }}</span>
            <!-- 消息内容（正文保持普通颜色） -->
            <span class="break-all whitespace-pre-wrap" :style="{ color: 'var(--text-color)' }">
              {{ log.message }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useDebugStore } from '@/stores/debug'
import type { LogLevel } from '@/stores/debug'
import SvgIcon from '@/components/SvgIcon.vue'
import Card from '@/components/Card.vue'

const route = useRoute()
const appStore = useAppStore()
const debugStore = useDebugStore()

const isDev = import.meta.env.DEV
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const userAgent = ref(navigator.userAgent)

// 图标列表 — 与 SvgIcon.vue 的 iconMap 保持一致
const iconList = [
  'home', 'market', 'messages', 'theme', 'settings', 'about',
  'sun', 'moon', 'download', 'check', 'close', 'menu', 'search', 'bell',
  'dashboard', 'folder', 'cpu', 'logo', 'package',
  'chevron-right', 'chevron-left',
]

let resizeHandler: (() => void) | null = null

onMounted(() => {
  debugStore.info('调试面板已加载')
  resizeHandler = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

const levelColors: Record<LogLevel, string> = {
  info: 'var(--accent-color)',
  warn: '#f59e0b',
  error: '#ef4444',
  state: '#a78bfa',
}

const levelLabels: Record<LogLevel, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  state: '[STATE]',
}

function levelColor(level: LogLevel) {
  return levelColors[level] || 'var(--disabled-color)'
}

function levelLabel(level: LogLevel) {
  return levelLabels[level] || '[INFO]'
}
</script>
