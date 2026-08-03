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

      <Card title="组件预览">
        <div class="space-y-5">
          <!-- TInput -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TInput</div>
            <div class="flex flex-col gap-2">
              <TInput v-model="demoText" label="文本输入" placeholder="请输入内容" />
              <TInput v-model="demoPwd" type="password" label="密码输入" placeholder="请输入密码" />
              <TInput v-model="demoText" label="禁用状态" disabled />
              <TInput v-model="demoText" label="错误状态" error="密码长度不能少于6位" />
            </div>
          </div>

          <!-- TSelect -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TSelect</div>
            <TSelect v-model="demoSelect" label="下拉选择" :options="selectOptions" />
          </div>

          <!-- TCheckbox -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TCheckbox</div>
            <div class="flex flex-col gap-2">
              <TCheckbox v-model="demoCheck1" label="已勾选" />
              <TCheckbox v-model="demoCheck2" label="未勾选" />
            </div>
          </div>

          <!-- TSwitch -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TSwitch</div>
            <div class="flex flex-col gap-2">
              <TSwitch v-model="demoSwitch1" label="已开启" />
              <TSwitch v-model="demoSwitch2" label="已关闭" />
            </div>
          </div>

          <!-- TButton -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TButton</div>
            <div class="flex flex-wrap gap-2">
              <TButton variant="accent">Accent</TButton>
              <TButton variant="outline">Outline</TButton>
              <TButton variant="text">Text</TButton>
              <TButton variant="accent" loading>Loading</TButton>
              <TButton variant="accent" disabled>Disabled</TButton>
            </div>
          </div>

          <!-- TTextarea -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TTextarea</div>
            <TTextarea v-model="demoText" label="备注" placeholder="请输入备注内容" />
          </div>

          <!-- TInputNumber -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TInputNumber</div>
            <TInputNumber v-model="demoNumber" label="数量" :min="0" :max="100" />
          </div>

          <!-- TRadioGroup -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TRadioGroup</div>
            <div class="space-y-3">
              <TRadioGroup v-model="demoRadio" label="块模式 (block)" :options="radioOptions" />
              <TRadioGroup v-model="demoRadio" label="圆点模式 (dot)" :options="radioOptions" mode="dot" />
            </div>
          </div>

          <!-- TDatePicker -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TDatePicker</div>
            <div class="space-y-3">
              <TDatePicker v-model="demoDate" label="日期 (date)" placeholder="选择日期" />
              <TDatePicker v-model="demoMonth" label="月份 (month)" placeholder="选择月份" type="month" />
              <TDatePicker v-model="demoYear" label="年份 (year)" placeholder="选择年份" type="year" />
              <TDatePicker v-model="demoTime" label="时间 (time)" placeholder="选择时间" type="time" />
              <TDatePicker v-model="demoDateTime" label="日期时间 (datetime)" placeholder="选择日期时间" type="datetime" />
            </div>
          </div>

          <!-- TDateRangePicker -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TDateRangePicker</div>
            <div class="space-y-3">
              <TDateRangePicker v-model="demoDateRange" label="日期范围 (date)" placeholder="选择日期范围" />
              <TDateRangePicker v-model="demoMonthRange" label="月份范围 (month)" placeholder="选择月份范围" type="month" />
              <TDateRangePicker v-model="demoYearRange" label="年份范围 (year)" placeholder="选择年份范围" type="year" />
            </div>
          </div>

          <!-- TFileUpload -->
          <div>
            <div class="text-xs font-medium mb-2" :style="{ color: 'var(--disabled-color)' }">TFileUpload</div>
            <TFileUpload v-model="demoFile" label="上传文件" hint="点击或拖拽 .zip 文件到此处" accept=".zip,.txt" />
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
      </Card>
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
import TInput from '@/components/form/TInput.vue'
import TSelect from '@/components/form/TSelect.vue'
import TCheckbox from '@/components/form/TCheckbox.vue'
import TSwitch from '@/components/form/TSwitch.vue'
import TButton from '@/components/form/TButton.vue'
import TTextarea from '@/components/form/TTextarea.vue'
import TInputNumber from '@/components/form/TInputNumber.vue'
import TRadioGroup from '@/components/form/TRadioGroup.vue'
import TDatePicker from '@/components/form/TDatePicker.vue'
import TDateRangePicker from '@/components/form/TDateRangePicker.vue'
import TFileUpload from '@/components/form/TFileUpload.vue'

const route = useRoute()
const appStore = useAppStore()
const debugStore = useDebugStore()

const isDev = import.meta.env.DEV
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const userAgent = ref(navigator.userAgent)

// 组件预览 demo 数据
const demoText = ref('')
const demoPwd = ref('')
const demoSelect = ref('option1')
const demoCheck1 = ref(true)
const demoCheck2 = ref(false)
const demoSwitch1 = ref(true)
const demoSwitch2 = ref(false)
const demoNumber = ref(10)
const demoRadio = ref('option1')
const demoDate = ref('')
const demoMonth = ref('')
const demoYear = ref('')
const demoTime = ref('')
const demoDateTime = ref('')
const demoDateRange = ref('')
const demoMonthRange = ref('')
const demoYearRange = ref('')
const demoFile = ref<File | null>(null)
const selectOptions = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三' },
]
const radioOptions = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三' },
]

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
