import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { readConfig, writeConfig, onConfigChanged, isTauriEnv } from '@/services/config'
import type { AppConfig } from '@/services/config'

export type LayoutType = '1' | '2' | '3'
export type AccentTheme = 'teal' | 'blue' | 'purple' | 'orange' | 'rose'
export type SidebarStyle = 'row' | 'column' | 'icon'
export type CloseBehavior = 'ask' | 'hide' | 'close'

export const useAppStore = defineStore('app', () => {
  const layoutType = ref<LayoutType>('1')
  const isDark = ref(false)
  const locale = ref('zh-CN')
  const accentTheme = ref<AccentTheme>('teal')
  const sidebarStyle = ref<SidebarStyle>('row')
  const skin = ref('')
  const appTitle = ref('企与星河')
  const appIcon = ref('')
  const closeBehavior = ref<CloseBehavior>('ask')

  // 异步初始化：加载配置（Tauri 读文件，浏览器读 localStorage 兜底）
  // 将一份 AppConfig 数据映射到响应式 state（启动加载与多窗口实时同步共用）
  function applyConfig(config: AppConfig) {
    if (config.layoutType) layoutType.value = config.layoutType as LayoutType
    if (config.isDark !== undefined) isDark.value = config.isDark
    if (config.locale) locale.value = config.locale
    if (config.accentTheme) accentTheme.value = config.accentTheme as AccentTheme
    if (config.sidebarStyle) sidebarStyle.value = config.sidebarStyle as SidebarStyle
    if (config.skin !== undefined) skin.value = migrateSkinPath(config.skin)
    if (config.appTitle) appTitle.value = config.appTitle
    if (config.appIcon !== undefined) appIcon.value = config.appIcon
    if (config.closeBehavior) closeBehavior.value = config.closeBehavior as CloseBehavior
  }

  async function init() {
    try {
      const content = await readConfig()
      if (content) {
        applyConfig(JSON.parse(content))
      }
    } catch {
      // 读取失败则使用默认值
    }
    applyTheme()
    applySkin()
    applyTitle()
    applyIcon()

    // 监听其他窗口的配置变更（Tauri 环境）
    if (isTauriEnv()) {
      onConfigChanged((config) => {
        applyConfig(config)
        applyTitle()
        applyIcon()
      })
    }
  }

  // 旧版默认皮肤路径 → 新版（bgN → builtin/skin-N）
  function migrateSkinPath(path: string): string {
    const m = /^\/skins\/bg(\d+)\.png$/.exec(path)
    if (!m) return path
    const n = m[1].padStart(2, '0')
    return `/skins/builtin/skin-${n}.png`
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

  // 标题同步：浏览器标签标题 + 主窗口任务栏标题（子窗口保留自身标题）
  function applyTitle() {
    document.title = appTitle.value
    if (!isTauriEnv()) return
    if (window.location.pathname.startsWith('/window')) return
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(appTitle.value))
      .catch(() => {})
  }

  // 窗口图标同步：把默认（logo.ico）或自定义图标设为 OS 窗口图标（任务栏/标题栏）
  async function applyIcon() {
    if (!isTauriEnv()) return
    if (window.location.pathname.startsWith('/window')) return
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const src = appIcon.value || '/logo.ico'
      const res = await fetch(src)
      const bytes = new Uint8Array(await res.arrayBuffer())
      await getCurrentWindow().setIcon(bytes)
    } catch (e) {
      // 图标设置失败不影响主流程
      console.error('[applyIcon]', e)
    }
  }

  function persistConfig() {
    const config: AppConfig = {
      layoutType: layoutType.value,
      isDark: isDark.value,
      locale: locale.value,
      accentTheme: accentTheme.value,
      sidebarStyle: sidebarStyle.value,
      skin: skin.value,
      appTitle: appTitle.value,
      appIcon: appIcon.value,
      closeBehavior: closeBehavior.value,
    }
    writeConfig(JSON.stringify(config)).catch(() => {
      // 写入失败则静默忽略
    })
    applyTheme()
    applySkin()
    applyTitle()
  }

  // 初始化时先应用主题 class（使用默认值）
  document.documentElement.classList.add(`accent-${accentTheme.value}`)

  watch([layoutType, isDark, locale, accentTheme, sidebarStyle, skin, appTitle, appIcon, closeBehavior], persistConfig, { deep: true })

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

  function setAppTitle(title: string) {
    appTitle.value = title
    applyTitle()
  }

  function setAppIcon(filename: string) {
    appIcon.value = filename
    applyIcon()
  }

  function setCloseBehavior(b: CloseBehavior) {
    closeBehavior.value = b
  }

  return {
    layoutType,
    isDark,
    locale,
    accentTheme,
    sidebarStyle,
    skin,
    appTitle,
    appIcon,
    closeBehavior,
    init,
    toggleTheme,
    setLayout,
    setLocale,
    setAccentTheme,
    setSidebarStyle,
    setSkin,
    setAppTitle,
    setAppIcon,
    setCloseBehavior,
  }
})
