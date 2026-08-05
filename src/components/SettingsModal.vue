<template>
  <Teleport to="body">
    <div v-if="appStore.showSettingsModal" class="settings-overlay" @click.self="close">
      <div class="settings-modal" :style="{ background: 'var(--bg-setting-item)' }">
        <!-- 左侧标签栏 -->
        <div class="settings-sidebar" :style="{ background: 'var(--bg-left-menu)', borderRight: '1px solid var(--line-color)' }">
          <div class="px-3 pt-5 pb-3">
            <div class="text-xs font-medium px-3 mb-2" :style="{ color: 'var(--disabled-color)' }">菜单</div>
            <div class="flex flex-col gap-0.5">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="tab-btn flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm w-full text-left"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <SvgIcon :name="tab.icon" :size="18" />
                <span>{{ $t(tab.label) }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="settings-content" :style="{ background: 'var(--bg-setting-item)' }">
          <!-- 固定的头部 -->
          <div class="settings-header">
            <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-color)' }">{{ $t(tabs.find(t => t.key === activeTab)?.label || '') }}</h2>
            <button class="close-btn" @click="close" :title="$t('common.cancel')">
              <SvgIcon name="close" :size="20" />
            </button>
          </div>

          <!-- 可滚动的设置项 -->
          <div class="settings-body">
            <!-- ====== 设置标签 ====== -->
            <div v-if="activeTab === 'settings'" class="space-y-5">
              <!-- 语言 -->
              <Card :title="$t('settings.language')">
                <Select
                  :modelValue="draftLocale"
                  :options="localeOptions"
                  @update:modelValue="draftLocale = $event"
                />
              </Card>

              <!-- 布局（图形化选择） -->
              <Card :title="$t('settings.layout')">
                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="opt in layoutOptions"
                    :key="opt.value"
                    class="layout-card flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200"
                    :class="{ active: draftLayout === opt.value }"
                    :style="{
                      border: draftLayout === opt.value ? '2px solid var(--accent-color)' : '2px solid var(--line-color)',
                      background: draftLayout === opt.value ? 'var(--bg-active-msg)' : 'transparent',
                    }"
                    @click="draftLayout = opt.value"
                  >
                    <!-- 布局预览图 -->
                    <div class="layout-preview" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
                      <svg v-if="opt.value === '1'" viewBox="0 0 80 56" class="w-full h-full">
                        <rect x="0" y="0" width="14" height="56" rx="2" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.4" />
                        <rect x="6" y="6" width="2" height="2" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="14" width="2" height="2" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="22" width="2" height="2" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="44" width="2" height="2" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="48" width="2" height="2" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="18" y="8" width="56" height="8" rx="1.5" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                        <rect x="18" y="22" width="40" height="6" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                        <rect x="18" y="32" width="30" height="6" rx="1" :fill="draftLayout === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                      </svg>
                      <svg v-if="opt.value === '2'" viewBox="0 0 80 56" class="w-full h-full">
                        <rect x="0" y="0" width="28" height="56" rx="2" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.4" />
                        <rect x="6" y="8" width="16" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" opacity="0.5" />
                        <rect x="6" y="14" width="14" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="20" width="14" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="30" width="16" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" opacity="0.5" />
                        <rect x="6" y="36" width="14" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="46" width="14" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="6" y="50" width="14" height="2" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="32" y="8" width="42" height="8" rx="1.5" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                        <rect x="32" y="22" width="32" height="6" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                        <rect x="32" y="32" width="24" height="6" rx="1" :fill="draftLayout === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                      </svg>
                      <svg v-if="opt.value === '3'" viewBox="0 0 80 56" class="w-full h-full">
                        <rect x="0" y="0" width="80" height="10" rx="2" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.4" />
                        <rect x="6" y="2" width="12" height="6" rx="1.5" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--disabled-color)'" />
                        <rect x="22" y="2" width="12" height="6" rx="1.5" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--disabled-color)'" opacity="0.5" />
                        <rect x="38" y="2" width="12" height="6" rx="1.5" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--disabled-color)'" opacity="0.5" />
                        <rect x="64" y="2" width="10" height="6" rx="1.5" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--disabled-color)'" opacity="0.3" />
                        <rect x="6" y="16" width="56" height="8" rx="1.5" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                        <rect x="6" y="30" width="44" height="6" rx="1" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                        <rect x="6" y="40" width="34" height="6" rx="1" :fill="draftLayout === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.15" />
                      </svg>
                    </div>
                    <span class="text-xs font-medium" :style="{ color: draftLayout === opt.value ? 'var(--text-active-color)' : 'var(--text-color)' }">
                      {{ $t(opt.label) }}
                    </span>
                  </button>
                </div>
              </Card>

              <!-- 主题色 -->
              <Card title="主题色">
                <div class="flex items-center gap-3">
                  <button
                    v-for="c in accentColors"
                    :key="c.key"
                    class="w-8 h-8 rounded-full transition-all duration-200"
                    :class="{ 'ring-2 ring-offset-2': draftAccent === c.key }"
                    :style="{
                      background: c.color,
                      '--tw-ring-color': c.color,
                      '--tw-ring-offset-color': 'var(--bg-setting-item)',
                      transform: draftAccent === c.key ? 'scale(1.15)' : 'scale(1)',
                    }"
                    :title="c.name"
                    @click="draftAccent = c.key"
                  />
                </div>
              </Card>

              <!-- 操作按钮 -->
              <div class="flex items-end justify-between pt-2">
                <TButton variant="outline" @click="resetDefaults">
                  {{ $t('common.reset') }}
                </TButton>
                <div class="flex items-center gap-3">
                  <span v-if="showSaved" class="text-sm" :style="{ color: 'var(--accent-color)' }">{{ $t('common.saved') }}</span>
                  <TButton variant="accent" :disabled="!isDirty" @click="onSave">
                    {{ $t('common.save') }}
                  </TButton>
                  <TButton variant="outline" @click="onReset">
                    {{ $t('common.cancel') }}
                  </TButton>
                </div>
              </div>
            </div>

            <!-- ====== 关于标签 ====== -->
            <div v-if="activeTab === 'about'" class="space-y-4">
              <Card>
                <div class="text-center">
                  <IconBox size="md" class="mx-auto mb-4">
                    <SvgIcon name="logo" :size="32" :style="{ color: 'var(--accent-color)' }" />
                  </IconBox>
                  <h3 class="text-xl font-bold mb-1" :style="{ color: 'var(--text-color)' }">Framework App</h3>
                  <p class="text-sm mb-5" :style="{ color: 'var(--disabled-color)' }">{{ $t('about.description') }}</p>
                  <div class="space-y-2 text-sm text-left px-4">
                    <div class="flex justify-between py-2.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
                      <span class="flex items-center gap-2">
                        <SvgIcon name="about" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                        {{ $t('about.version') }}
                      </span>
                      <span :style="{ color: 'var(--text-color)' }">0.1.0</span>
                    </div>
                    <div class="flex justify-between py-2.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
                      <span class="flex items-center gap-2">
                        <SvgIcon name="cpu" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                        Tauri
                      </span>
                      <span :style="{ color: 'var(--text-color)' }">2.x</span>
                    </div>
                    <div class="flex justify-between py-2.5">
                      <span class="flex items-center gap-2">
                        <SvgIcon name="home" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                        {{ $t('about.author') }}
                      </span>
                      <span :style="{ color: 'var(--text-color)' }">Framework Team</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import type { AccentTheme } from '@/stores/app'
import SvgIcon from '@/components/SvgIcon.vue'
import Card from '@/components/Card.vue'
import IconBox from '@/components/IconBox.vue'
import Select from '@/components/form/TSelect.vue'
import TButton from '@/components/form/TButton.vue'

const { locale } = useI18n()
const appStore = useAppStore()

const tabs = [
  { key: 'settings', icon: 'settings', label: 'settings.title' },
  { key: 'about', icon: 'about', label: 'about.title' },
]

const activeTab = ref('settings')

const localeOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
]

const layoutOptions = [
  { value: '1' as const, label: 'layout.layout1' },
  { value: '2' as const, label: 'layout.layout2' },
  { value: '3' as const, label: 'layout.layout3' },
]

const accentColors: { key: AccentTheme; name: string; color: string }[] = [
  { key: 'teal',   name: '青绿',   color: '#13987f' },
  { key: 'blue',   name: '蓝色',   color: '#3b82f6' },
  { key: 'purple', name: '紫色',   color: '#8b5cf6' },
  { key: 'orange', name: '橙色',   color: '#f59e0b' },
  { key: 'rose',   name: '玫瑰红', color: '#e11d48' },
]

const DEFAULT_LAYOUT = '1'
const DEFAULT_LOCALE = 'zh-CN'
const DEFAULT_ACCENT: AccentTheme = 'teal'

const draftLayout = ref(appStore.layoutType)
const draftLocale = ref(appStore.locale)
const draftAccent = ref<AccentTheme>(appStore.accentTheme)
const showSaved = ref(false)

const isDirty = computed(() =>
  draftLayout.value !== appStore.layoutType ||
  draftLocale.value !== appStore.locale ||
  draftAccent.value !== appStore.accentTheme
)

function close() {
  onReset()
  appStore.toggleSettingsModal()
}

function onSave() {
  if (!isDirty.value) return
  appStore.setLayout(draftLayout.value)
  appStore.setLocale(draftLocale.value)
  appStore.setAccentTheme(draftAccent.value)
  locale.value = draftLocale.value
  showSaved.value = true
  setTimeout(() => { showSaved.value = false }, 2000)
}

function onReset() {
  draftLayout.value = appStore.layoutType
  draftLocale.value = appStore.locale
  draftAccent.value = appStore.accentTheme
}

function resetDefaults() {
  draftLayout.value = DEFAULT_LAYOUT
  draftLocale.value = DEFAULT_LOCALE
  draftAccent.value = DEFAULT_ACCENT
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.settings-modal {
  display: flex;
  width: 680px;
  height: 520px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.settings-sidebar {
  width: 160px;
  min-width: 160px;
  flex-shrink: 0;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 固定的头部栏，不随内容滚动 */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 16px;
  flex-shrink: 0;
}

/* 可滚动的设置项区域 */
.settings-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding-right: 4px;
}

/* 自定义滚动条 — 窄、半透明、不占布局宽度 */
.settings-body::-webkit-scrollbar {
  width: 5px;
}

.settings-body::-webkit-scrollbar-track {
  background: transparent;
}

.settings-body::-webkit-scrollbar-thumb {
  background: var(--line-color);
  border-radius: 3px;
}

.settings-body::-webkit-scrollbar-thumb:hover {
  background: var(--disabled-color);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-color);
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--bg-hover-muted);
}

.tab-btn {
  color: var(--text-color);
  background: transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-left-menu-hover);
}

.tab-btn.active {
  color: var(--text-active-color);
  background: var(--bg-active-msg);
}

.layout-card {
  transition: all 0.2s;
}

.layout-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--box-shadow-color);
}

.layout-preview {
  width: 100%;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
}

.layout-preview svg {
  display: block;
}
</style>
