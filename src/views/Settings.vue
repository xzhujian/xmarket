<template>
  <div class="settings-page">
    <div class="max-w-md mx-auto space-y-4">
      <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-color)' }">{{ $t('settings.title') }}</h2>
      <Card :title="$t('settings.language')">
        <Select
          :modelValue="draftLocale"
          :options="localeOptions"
          @update:modelValue="draftLocale = $event"
        />
      </Card>

      <Card :title="$t('settings.layout')">
        <div class="flex flex-col gap-2">
          <label
            v-for="opt in layoutOptions"
            :key="opt.value"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
            :style="{
              background: draftLayout === opt.value ? 'var(--bg-active-msg)' : 'transparent',
            }"
            @click="draftLayout = opt.value"
          >
            <input type="radio" :value="opt.value" :checked="draftLayout === opt.value" class="accent-[var(--accent-color)]" />
            <span class="text-sm" :style="{ color: draftLayout === opt.value ? 'var(--text-active-color)' : 'var(--text-color)' }">{{ $t(opt.label) }}</span>
          </label>
        </div>
      </Card>

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
      <div class="flex items-end justify-between pt-4">
        <TButton variant="outline" @click="resetDefaults">
          {{ $t('common.reset') }}
        </TButton>

        <div class="flex items-center gap-3">
          <TButton variant="accent" :disabled="!isDirty" @click="onSave">
            {{ $t('common.save') }}
          </TButton>
          <TButton variant="outline" @click="onReset">
            {{ $t('common.cancel') }}
          </TButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import type { AccentTheme } from '@/stores/app'
import Card from '@/components/Card.vue'
import Select from '@/components/form/TSelect.vue'
import TButton from '@/components/form/TButton.vue'

const { locale } = useI18n()
const appStore = useAppStore()

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

/** 默认值 */
const DEFAULT_LAYOUT = '1'
const DEFAULT_LOCALE = 'zh-CN'
const DEFAULT_ACCENT: AccentTheme = 'teal'

// ====== 草稿状态：仅在保存时写入 store ======
const draftLayout = ref(appStore.layoutType)
const draftLocale = ref(appStore.locale)
const draftAccent = ref<AccentTheme>(appStore.accentTheme)

/** 是否有未保存的改动 */
const isDirty = computed(() =>
  draftLayout.value !== appStore.layoutType ||
  draftLocale.value !== appStore.locale ||
  draftAccent.value !== appStore.accentTheme
)

function onSave() {
  if (!isDirty.value) return

  appStore.setLayout(draftLayout.value)
  appStore.setLocale(draftLocale.value)
  appStore.setAccentTheme(draftAccent.value)
  locale.value = draftLocale.value
}

function onReset() {
  // 重置为 store 当前值（即上次保存的值）
  draftLayout.value = appStore.layoutType
  draftLocale.value = appStore.locale
  draftAccent.value = appStore.accentTheme
}

function resetDefaults() {
  // 重置为系统默认值
  draftLayout.value = DEFAULT_LAYOUT
  draftLocale.value = DEFAULT_LOCALE
  draftAccent.value = DEFAULT_ACCENT
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
