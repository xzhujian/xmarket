import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { readConfig, writeConfig, onConfigChanged, isTauriEnv } from '@/services/config'
import type { AppConfig } from '@/services/config'

export type LayoutType = '1' | '2' | '3'
export type AccentTheme = 'teal' | 'blue' | 'purple' | 'orange' | 'rose'
export type SidebarStyle = 'row' | 'column' | 'icon'

export const useAppStore = defineStore('app', () => {
  const layoutType = ref<LayoutType>('1')
  const isDark = ref(false)
  const locale = ref('zh-CN')
  const sidebarCollapsed = ref(false)
  const accentTheme = ref<AccentTheme>('teal')
  const sidebarStyle = ref<SidebarStyle>('row')
  const skin = ref('')

  // 异步初始化：从 Tauri 文件加载配置
  async function init() {
    if (!isTauriEnv()) return
    try {
      const content = await readConfig()
      if (content) {
        const config: AppConfig = JSON.parse(content)
        if (config.layoutType) layoutType.value = config.layoutType as LayoutType
        if (config.isDark !== undefined) isDark.value = config.isDark
        if (config.locale) locale.value = config.locale
        if (config.accentTheme) accentTheme.value = config.accentTheme as AccentTheme
        if (config.sidebarStyle) sidebarStyle.value = config.sidebarStyle as SidebarStyle
        if (config.skin !== undefined) skin.value = config.skin
      }
    } catch {
      // 读取失败则使用默认值
    }
    applyTheme()
    applySkin()

    // 监听其他窗口的配置变更
    onConfigChanged((config) => {
      if (config.layoutType) layoutType.value = config.layoutType as LayoutType
      if (config.isDark !== undefined) isDark.value = config.isDark
      if (config.locale) locale.value = config.locale
      if (config.accentTheme) accentTheme.value = config.accentTheme as AccentTheme
      if (config.sidebarStyle) sidebarStyle.value = config.sidebarStyle as SidebarStyle
      if (config.skin !== undefined) skin.value = config.skin
    })
  }

  function applySkin() {
    const root = document.documentElement
    if (skin.value) {
      root.style.setProperty('--skin-image', `url("${skin.value}")`)
      // 底部可读性遮罩：从底部渐隐，避免背景图影响界面文字
      root.style.setProperty('--skin-scrim', 'linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0) 55%)')
    } else {
      root.style.removeProperty('--skin-image')
      root.style.removeProperty('--skin-scrim')
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
    document.documentElement.className = document.documentElement.className
      .split(' ')
      .filter(c => !c.startsWith('accent-'))
      .concat(`accent-${accentTheme.value}`)
      .join(' ')
  }

  function persistConfig() {
    if (!isTauriEnv()) return
    const config: AppConfig = {
      layoutType: layoutType.value,
      isDark: isDark.value,
      locale: locale.value,
      accentTheme: accentTheme.value,
      sidebarStyle: sidebarStyle.value,
      skin: skin.value,
    }
    writeConfig(JSON.stringify(config)).catch(() => {
      // 写入失败则静默忽略
    })
    applyTheme()
    applySkin()
  }

  // 初始化时先应用主题 class（使用默认值）
  document.documentElement.classList.add(`accent-${accentTheme.value}`)

  watch([layoutType, isDark, locale, accentTheme, sidebarStyle, skin], persistConfig, { deep: true })

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  function setLayout(type: LayoutType) {
    layoutType.value = type
  }

  function setLocale(lang: string) {
    locale.value = lang
  }

  function setAccentTheme(theme: AccentTheme) {
    accentTheme.value = theme
  }

  function setSidebarStyle(style: SidebarStyle) {
    sidebarStyle.value = style
  }

  function setSkin(value: string) {
    skin.value = value
    applySkin()
  }

  return {
    layoutType,
    isDark,
    locale,
    sidebarCollapsed,
    accentTheme,
    sidebarStyle,
    skin,
    init,
    toggleTheme,
    setLayout,
    setLocale,
    setAccentTheme,
    setSidebarStyle,
    setSkin,
  }
})
