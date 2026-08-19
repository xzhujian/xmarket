<template>
  <div class="settings-page flex h-full">
    <!-- 左侧标签栏 -->
    <div class="settings-sidebar" :style="{ background: 'var(--bg-left-menu)', borderRight: '1px solid var(--line-color)' }">
      <div class="px-3 pt-5 pb-3">
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
    <div class="settings-content flex-1 flex flex-col overflow-hidden" :style="{ background: 'var(--content-bg)' }">
      <div class="settings-body flex-1 overflow-y-auto px-6 pt-5 pb-6">
        <!-- ====== 通用标签 ====== -->
        <div v-if="activeTab === 'general'" class="space-y-5">
          <Card :title="$t('settings.language')">
            <Select
              :modelValue="appStore.locale"
              :options="localeOptions"
              @update:modelValue="onLocaleChange($event)"
            />
          </Card>

          <!-- 关闭行为 -->
          <Card :title="$t('settings.closeBehavior')">
            <RadioGroup
              :modelValue="appStore.closeBehavior"
              :options="closeBehaviorOptions"
              mode="dot"
              @update:modelValue="appStore.setCloseBehavior($event as CloseBehavior)"
            />
          </Card>
        </div>

        <!-- ====== 高级标签 ====== -->
        <div v-if="activeTab === 'advanced'" class="space-y-5">
          <!-- 应用标题 -->
          <Card :title="$t('settings.appTitle')">
            <TInput
              v-model="titleDraft"
              :placeholder="$t('settings.titlePlaceholder')"
              @keyup.enter="commitTitle"
            />
            <div class="action-row">
              <button
                v-if="appStore.appTitle !== appStore.defaultTitle"
                class="text-btn"
                @click="resetTitle"
              >{{ $t('settings.titleDefault') }}</button>
              <TButton variant="accent" @click="commitTitle">{{ $t('common.save') }}</TButton>
            </div>
          </Card>

          <!-- 应用图标 -->
          <Card :title="$t('settings.appIcon')">
            <div class="icon-preview">
              <IconBox size="lg">
                <BrandLogo :size="36" />
              </IconBox>
            </div>
            <div class="icon-actions">
              <TButton variant="accent" icon="upload" @click="triggerIconFile">
                {{ $t('settings.iconUpload') }}
              </TButton>
              <button v-if="appStore.appIcon" class="text-btn" @click="resetIcon">
                {{ $t('settings.iconDefault') }}
              </button>
            </div>
            <p v-if="iconError" class="upload-error">{{ iconError }}</p>
            <input
              ref="iconFileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="hidden"
              @change="onIconUpload"
            />
          </Card>
        </div>

        <!-- ====== 市场标签 ====== -->
        <div v-if="activeTab === 'market'" class="space-y-5">
          <Card :title="$t('settings.market')">
            <p class="market-tip">{{ $t('settings.marketTip') }}</p>

            <div v-if="appStore.markets.length" class="market-list">
              <div v-for="(m, i) in appStore.markets" :key="i" class="market-row">
                <div class="market-info">
                  <span class="market-name">{{ m.name }}</span>
                  <span class="market-url">{{ m.url }}</span>
                </div>
                <button
                  class="market-del"
                  :title="$t('common.delete')"
                  @click="removeMarket(i)"
                >
                  <SvgIcon name="close" :size="15" />
                </button>
              </div>
            </div>

            <button class="market-add-btn" @click="openAddMarket">
              <SvgIcon name="plus" :size="16" />
              {{ $t('settings.marketAdd') }}
            </button>
          </Card>

          <!-- 添加市场弹窗：填完即添加并提交，无保存按钮 -->
          <TModal v-model="showAddMarket" :title="$t('settings.marketAdd')" size="sm">
            <div class="add-market-form">
              <TInput v-model="addName" :placeholder="$t('settings.marketName')" />
              <TInput v-model="addUrl" :placeholder="$t('settings.marketUrlPlaceholder')" @keyup.enter="confirmAddMarket" />
            </div>
            <template #footer>
              <TButton variant="outline" @click="showAddMarket = false">{{ $t('common.cancel') }}</TButton>
              <TButton variant="accent" @click="confirmAddMarket">{{ $t('settings.marketAdd') }}</TButton>
            </template>
          </TModal>
        </div>

        <!-- ====== 主题标签 ====== -->
        <div v-if="activeTab === 'theme'" class="space-y-5">
          <Card :title="$t('theme.accent')">
            <div class="flex items-center gap-3">
              <button
                v-for="c in accentColors"
                :key="c.key"
                class="w-8 h-8 rounded-full transition-all duration-200"
                :class="{ 'ring-2 ring-offset-2': appStore.accentTheme === c.key }"
                :style="{
                  background: c.color,
                  '--tw-ring-color': c.color,
                  '--tw-ring-offset-color': 'var(--bg-setting-item)',
                  transform: appStore.accentTheme === c.key ? 'scale(1.15)' : 'scale(1)',
                }"
                :title="c.name"
                @click="appStore.setAccentTheme(c.key)"
              />
            </div>
          </Card>

          <!-- 皮肤 -->
          <Card :title="$t('settings.skin')">
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="opt in skinOptions"
                :key="opt.id"
                class="skin-card flex flex-col items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200"
                :class="{ active: appStore.skin === opt.path }"
                :style="{
                  border: appStore.skin === opt.path ? '2px solid var(--accent-color)' : '2px solid var(--line-color)',
                  background: appStore.skin === opt.path ? 'var(--bg-active-msg)' : 'transparent',
                }"
                @click="appStore.setSkin(opt.path)"
              >
                <div class="skin-thumb w-full h-16 rounded-lg" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
                  <img v-if="opt.path" :src="opt.path" :alt="opt.label" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-xl" :style="{ color: 'var(--disabled-color)' }">∅</div>
                </div>
              </button>
            </div>

            <!-- 自定义皮肤（可删除，不影响默认皮肤） -->
            <div v-if="customSkins.length" class="mt-4">
              <div class="text-xs mb-2" :style="{ color: 'var(--disabled-color)' }">{{ $t('settings.customSkins') }}</div>
              <div class="grid grid-cols-3 gap-3">
                <div
                  v-for="url in customSkins"
                  :key="url"
                  class="skin-card relative flex flex-col items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200"
                  :class="{ active: appStore.skin === url }"
                  :style="{
                    border: appStore.skin === url ? '2px solid var(--accent-color)' : '2px solid var(--line-color)',
                    background: appStore.skin === url ? 'var(--bg-active-msg)' : 'transparent',
                  }"
                  @click="appStore.setSkin(url)"
                >
                  <div class="skin-thumb w-full h-16 rounded-lg" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
                    <img :src="url" alt="自定义皮肤" class="w-full h-full object-cover" />
                  </div>
                  <button
                    class="skin-delete absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none"
                    :style="{ background: 'rgba(0,0,0,0.45)', color: '#fff' }"
                    :title="$t('common.delete')"
                    @click.stop="removeCustomSkin(url)"
                  >×</button>
                </div>
              </div>
            </div>

            <!-- 自定义上传 -->
            <div class="mt-4">
              <button
                class="skin-upload-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm cursor-pointer transition-all"
                :style="{ border: '1px dashed var(--line-color)', color: 'var(--text-color)', background: 'transparent' }"
                @click="triggerSkinFile"
              >
                <SvgIcon name="upload" :size="16" :style="{ color: 'var(--accent-color)' }" />
                {{ $t('settings.skinUpload') }}
              </button>
              <input
                ref="skinFileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="hidden"
                @change="onSkinUpload"
              />
            </div>
          </Card>
        </div>

        <!-- ====== 布局标签 ====== -->
        <div v-if="activeTab === 'layout'" class="space-y-5">
          <Card :title="$t('settings.layout')">
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="opt in layoutOptions"
                :key="opt.value"
                class="layout-card flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200"
                :class="{ active: appStore.layoutType === opt.value }"
                :style="{
                  border: appStore.layoutType === opt.value ? '2px solid var(--accent-color)' : '2px solid var(--line-color)',
                  background: appStore.layoutType === opt.value ? 'var(--bg-active-msg)' : 'transparent',
                }"
                @click="appStore.setLayout(opt.value)"
              >
                <div class="layout-preview" :style="{ background: 'var(--bg-setting-item)', border: '1px solid var(--line-color)' }">
                  <svg v-if="opt.value === '1'" viewBox="0 0 80 56" class="w-full h-full">
                    <!-- 窄侧栏（贯穿全高） -->
                    <rect x="0" y="0" width="14" height="56" rx="2" :fill="appStore.layoutType === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.45" />
                    <!-- 右侧：标题栏 -->
                    <rect x="16" y="0" width="64" height="10" rx="2" :fill="appStore.layoutType === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                    <!-- 右侧：内容区 -->
                    <rect x="16" y="12" width="64" height="44" rx="2" :fill="appStore.layoutType === '1' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.12" />
                  </svg>
                  <svg v-if="opt.value === '2'" viewBox="0 0 80 56" class="w-full h-full">
                    <!-- 顶部标题栏（通栏） -->
                    <rect x="0" y="0" width="80" height="10" rx="2" :fill="appStore.layoutType === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                    <!-- 左侧标准侧栏 -->
                    <rect x="0" y="12" width="28" height="44" rx="2" :fill="appStore.layoutType === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.45" />
                    <!-- 右侧内容区 -->
                    <rect x="30" y="12" width="50" height="44" rx="2" :fill="appStore.layoutType === '2' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.12" />
                  </svg>
                  <svg v-if="opt.value === '3'" viewBox="0 0 80 56" class="w-full h-full">
                    <!-- 顶部标题栏（通栏） -->
                    <rect x="0" y="0" width="80" height="10" rx="2" :fill="appStore.layoutType === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.25" />
                    <!-- 标签栏（通栏） -->
                    <rect x="0" y="12" width="80" height="10" rx="2" :fill="appStore.layoutType === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.45" />
                    <!-- 内容区（通栏） -->
                    <rect x="0" y="24" width="80" height="32" rx="2" :fill="appStore.layoutType === '3' ? 'var(--accent-color)' : 'var(--line-color)'" opacity="0.12" />
                  </svg>
                </div>
                <span class="text-xs font-medium" :style="{ color: appStore.layoutType === opt.value ? 'var(--text-active-color)' : 'var(--text-color)' }">
                  {{ $t(opt.label) }}
                </span>
              </button>
            </div>
          </Card>

          <!-- 侧边栏按钮样式（标签页模式无侧栏，隐藏） -->
          <Card v-if="appStore.layoutType !== '3'" :title="$t('settings.sidebarStyle')">
            <RadioGroup
              :modelValue="appStore.sidebarStyle"
              :options="sidebarStyleOptions"
              mode="dot"
              @update:modelValue="appStore.setSidebarStyle($event as SidebarStyle)"
            />
          </Card>
        </div>

        <!-- ====== 关于标签 ====== -->
        <div v-if="activeTab === 'about'" class="space-y-4">
          <Card>
            <div class="text-center">
              <IconBox size="md" class="mx-auto mb-4">
                <BrandLogo :size="32" />
              </IconBox>
              <h3 class="text-xl font-bold mb-1" :style="{ color: 'var(--text-color)' }">{{ appStore.appTitle }}</h3>
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
                    <SvgIcon name="license" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                    {{ $t('about.license') }}
                  </span>
                  <span :style="{ color: 'var(--text-color)' }">{{ $t('about.licenseTbd') }}</span>
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import type { AccentTheme, SidebarStyle, CloseBehavior } from '@/stores/app'
import SvgIcon from '@/components/SvgIcon.vue'
import Card from '@/components/Card.vue'
import IconBox from '@/components/IconBox.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import Select from '@/components/form/TSelect.vue'
import RadioGroup from '@/components/form/TRadioGroup.vue'
import TInput from '@/components/form/TInput.vue'
import TButton from '@/components/form/TButton.vue'
import TModal from '@/components/form/TModal.vue'
import { DEFAULT_SKINS, uploadSkin, listCustomSkins, deleteCustomSkin } from '@/services/skin'
import { uploadIcon, deleteIcon } from '@/services/icon'

const { locale, t } = useI18n()
const appStore = useAppStore()

// 同步 Pinia store 的 locale 到 vue-i18n（主窗口或配置文件变更时生效）
watch(() => appStore.locale, (val) => { locale.value = val }, { immediate: true })

const tabs = [
  { key: 'general', icon: 'settings', label: 'settings.general' },
  { key: 'market', icon: 'market', label: 'settings.market' },
  { key: 'theme', icon: 'theme', label: 'settings.theme' },
  { key: 'layout', icon: 'layout', label: 'settings.layoutTab' },
  { key: 'advanced', icon: 'wrench', label: 'settings.advanced' },
  { key: 'about', icon: 'about', label: 'about.title' },
]

const activeTab = ref('general')

// —— 通用：标题 ——
const titleDraft = ref(appStore.appTitle)
// 其他窗口变更配置时同步本地草稿
watch(
  () => appStore.appTitle,
  (val) => { if (titleDraft.value !== val) titleDraft.value = val },
)
function commitTitle() {
  appStore.setAppTitle(titleDraft.value.trim() || appStore.defaultTitle)
  titleDraft.value = appStore.appTitle
}
function resetTitle() {
  appStore.setAppTitle(appStore.defaultTitle)
  titleDraft.value = appStore.defaultTitle
}

// —— 市场：列表只读展示 + 删除；「添加市场」弹窗填完即添加提交，无保存按钮 ——
const showAddMarket = ref(false)
const addName = ref('')
const addUrl = ref('')
function openAddMarket() {
  addName.value = ''
  addUrl.value = ''
  showAddMarket.value = true
}
function normalizeMarketUrl(url: string) {
  if (!url) return url
  return /^https?:\/\//i.test(url) ? url : `http://${url}`
}
function confirmAddMarket() {
  const name = addName.value.trim()
  const url = normalizeMarketUrl(addUrl.value.trim())
  if (!name || !url) return
  appStore.setMarkets([...appStore.markets, { name, url }])
  showAddMarket.value = false
}
function removeMarket(i: number) {
  appStore.setMarkets(appStore.markets.filter((_, idx) => idx !== i))
}

// —— 通用：图标 ——
const iconFileInput = ref<HTMLInputElement | null>(null)
const ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const iconError = ref('')
function triggerIconFile() {
  iconFileInput.value?.click()
}
async function onIconUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!ALLOWED_ICON_TYPES.includes(file.type)) {
    iconError.value = t('settings.iconTypeError')
    input.value = ''
    return
  }
  iconError.value = ''
  try {
    const key = await uploadIcon(file)
    appStore.setAppIcon(key)
  } catch (err) {
    console.error('[Settings] 图标上传失败', err)
  } finally {
    if (iconFileInput.value) iconFileInput.value.value = ''
  }
}
async function resetIcon() {
  await deleteIcon(appStore.appIcon)
  appStore.setAppIcon('')
}

const localeOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
]

const layoutOptions = [
  { value: '1' as const, label: 'layout.layout1' },
  { value: '2' as const, label: 'layout.layout2' },
  { value: '3' as const, label: 'layout.layout3' },
]

const sidebarStyleOptions = computed<{ value: SidebarStyle; label: string }[]>(() => [
  { value: 'row', label: t('settings.sidebarRow') },
  { value: 'column', label: t('settings.sidebarColumn') },
  { value: 'icon', label: t('settings.sidebarIcon') },
])

const closeBehaviorOptions = computed<{ value: CloseBehavior; label: string }[]>(() => [
  { value: 'ask', label: t('settings.closeAsk') },
  { value: 'hide', label: t('settings.closeHide') },
  { value: 'close', label: t('settings.closeDirect') },
])

const accentColors: { key: AccentTheme; name: string; color: string }[] = [
  { key: 'teal',   name: '青绿',   color: '#13987f' },
  { key: 'blue',   name: '蓝色',   color: '#3b82f6' },
  { key: 'purple', name: '紫色',   color: '#8b5cf6' },
  { key: 'orange', name: '橙色',   color: '#f59e0b' },
  { key: 'rose',   name: '玫瑰红', color: '#e11d48' },
]

const skinOptions = computed<{ id: string; path: string; label: string }[]>(() => [
  { id: 'none', path: '', label: t('settings.skinNone') },
  ...DEFAULT_SKINS.map((s, i) => ({ id: s.id, path: s.path, label: `${t('settings.skin')} ${i + 1}` })),
])

const skinFileInput = ref<HTMLInputElement | null>(null)

const customSkins = ref<string[]>([])

async function loadCustomSkins() {
  customSkins.value = await listCustomSkins()
}
loadCustomSkins()

function triggerSkinFile() {
  skinFileInput.value?.click()
}

async function onSkinUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const url = await uploadSkin(file)
    appStore.setSkin(url)
    await loadCustomSkins()
  } catch (err) {
    console.error('[Settings] 皮肤上传失败', err)
  } finally {
    if (skinFileInput.value) skinFileInput.value.value = ''
  }
}

async function removeCustomSkin(url: string) {
  try {
    await deleteCustomSkin(url)
    customSkins.value = customSkins.value.filter((u) => u !== url)
    if (appStore.skin === url) appStore.setSkin('')
  } catch (err) {
    console.error('[Settings] 删除皮肤失败', err)
  }
}

function onLocaleChange(value: string) {
  appStore.setLocale(value)
  locale.value = value
}
</script>

<style scoped>
.settings-sidebar {
  width: 160px;
  min-width: 160px;
  flex-shrink: 0;
}

.settings-body {
  scrollbar-gutter: stable;
}

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
  overflow: clip;
}

.layout-preview svg {
  display: block;
}

/* 缩略图不拦截滚轮事件，保证悬停图片时容器仍可滚动 */
.skin-thumb {
  /* 用 clip 而非 hidden：hidden 会创建滚动容器吞掉滚轮事件，clip 只裁切不拦滚动 */
  overflow: clip;
}
.skin-thumb img {
  pointer-events: none;
}

.skin-delete:hover {
  background: rgba(0, 0, 0, 0.7) !important;
}

/* ===== 市场配置 ===== */
.market-tip {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--disabled-color);
  line-height: 1.6;
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.market-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line-color);
  border-radius: 10px;
  background: var(--bg-setting-item, transparent);
}

.market-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.market-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.market-url {
  font-size: 12px;
  color: var(--disabled-color);
  /* clip 而非 hidden：hidden 会进滚动链吞掉滚轮，clip 只裁切不拦滚动，省略号仍生效 */
  overflow: clip;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 添加市场：实底主色按钮，白字始终可见，字号适中 */
.market-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  padding: 11px 0;
  border: none;
  border-radius: 10px;
  background: var(--accent-color);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: filter 0.2s;
}

.market-add-btn:hover {
  filter: brightness(1.08);
}

.add-market-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market-del {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--disabled-color);
  cursor: pointer;
  transition: all 0.2s;
}

.market-del:hover {
  color: #fff;
  background: var(--danger-color, #ef4444);
}

/* ===== 通用：应用标题 / 应用图标 ===== */
.icon-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 14px;
}

.icon-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.text-btn {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-size: 13px;
  color: var(--accent-color);
  cursor: pointer;
}

.text-btn:hover {
  text-decoration: underline;
}

.upload-error {
  margin: 10px 0 0;
  font-size: 12px;
  color: #ef4444;
  text-align: center;
}
</style>
