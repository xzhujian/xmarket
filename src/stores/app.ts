import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readConfig, writeConfig, onConfigChanged, isTauriEnv, getAppDefaults } from '@/services/config'
import { getAppIcon } from '@/services/icon'
import type { AppConfig } from '@/services/config'
import type { MarketConfig } from '@/constants/markets'

export type LayoutType = '1' | '2' | '3'
export type AccentTheme = 'teal' | 'blue' | 'purple' | 'orange' | 'rose'
export type SidebarStyle = 'row' | 'column' | 'icon'
export type CloseBehavior = 'ask' | 'hide' | 'close'

function marketsEqual(a: MarketConfig[], b: MarketConfig[]): boolean {
  if (a.length !== b.length) return false
  return a.every((m, i) => m.name === b[i].name && m.url === b[i].url)
}

// 数据流：后端 config 文件是唯一事实来源。本 store 的 state 只是它的“投影”，
// 只允许通过 applyConfig（启动读取 / 后端 config-changed 广播）更新；
// 所有写入统一走 commitConfig → 后端写盘 → 广播 → applyConfig 回灌。
export const useAppStore = defineStore('app', () => {
  const layoutType = ref<LayoutType>('1')
  const isDark = ref(false)
  const locale = ref('zh-CN')
  const accentTheme = ref<AccentTheme>('teal')
  const sidebarStyle = ref<SidebarStyle>('row')
  const skin = ref('')
  const defaultTitle = ref('企与星河') // 默认应用名:跟随打包 productName(branding.json)
  const appTitle = ref(defaultTitle.value)
  let defaultIconBytes: Uint8Array | null = null // 默认窗口图标字节缓存（跟随 branding.icon）
  const appIcon = ref('')
  const appIconSrc = ref('/logo.ico') // 显示用 src（Tauri 由字节生成 objectURL，不持久化）
  const closeBehavior = ref<CloseBehavior>('ask')
  // 用户配置的插件市场列表（设置中维护，多市场各占一个 tab；默认空）
  const markets = ref<MarketConfig[]>([])
  // 图标是否已应用过一次（保证启动时即使无配置也会设置默认窗口图标）
  let iconApplied = false

  // 将一份 AppConfig 数据映射到响应式 state（state 的唯一写入入口）。
  // 同时承担副作用：主题/皮肤/标题跟随状态更新；图标仅在值变化或首次时刷新，
  // 避免无关广播反复重新生成 objectURL。
  function applyConfig(config: Partial<AppConfig>) {
    if (config.layoutType) layoutType.value = config.layoutType as LayoutType
    if (config.isDark !== undefined) isDark.value = config.isDark
    if (config.locale) locale.value = config.locale
    if (config.accentTheme) accentTheme.value = config.accentTheme as AccentTheme
    if (config.sidebarStyle) sidebarStyle.value = config.sidebarStyle as SidebarStyle
    if (config.skin !== undefined) skin.value = migrateSkinPath(config.skin)
    if (config.appTitle) appTitle.value = config.appTitle
    const iconChanged = config.appIcon !== undefined && config.appIcon !== appIcon.value
    if (config.appIcon !== undefined) appIcon.value = config.appIcon
    if (config.closeBehavior) closeBehavior.value = config.closeBehavior as CloseBehavior
    // 数组引用每次赋值都算"变化"，内容相同时跳过赋值，避免无谓的响应式触发
    if (Array.isArray(config.markets) && !marketsEqual(config.markets, markets.value)) {
      markets.value = config.markets
    }
    applyTheme()
    applySkin()
    applyTitle()
    if (iconChanged || !iconApplied) {
      applyIcon()
      iconApplied = true
    }
  }

  async function init() {
    // 默认名称与默认图标跟随打包品牌 branding.json,同一安装包内固定
    if (isTauriEnv()) {
      const d = await getAppDefaults().catch(() => null)
      if (d) {
        if (d.name) {
          defaultTitle.value = d.name
          appTitle.value = d.name
        }
        if (d.icon?.length) defaultIconBytes = new Uint8Array(d.icon)
      }
    }
    try {
      const content = await readConfig()
      if (content) applyConfig(JSON.parse(content))
      else applyConfig({}) // 无配置也应用一次默认（含默认窗口图标）
    } catch {
      applyConfig({}) // 读取失败则使用默认值
    }

    // 监听其他窗口的配置变更（Tauri 环境）
    if (isTauriEnv()) {
      onConfigChanged((config) => applyConfig(config))
    }
  }

  // 当前 state 快照 → 完整配置（供提交与草稿构建使用）
  function snapshotConfig(): AppConfig {
    return {
      layoutType: layoutType.value,
      isDark: isDark.value,
      locale: locale.value,
      accentTheme: accentTheme.value,
      sidebarStyle: sidebarStyle.value,
      skin: skin.value,
      appTitle: appTitle.value,
      appIcon: appIcon.value,
      closeBehavior: closeBehavior.value,
      markets: markets.value,
    }
  }

  // 唯一写入路径：整份配置发送到后端落盘；后端再广播 config-changed，
  // 由 applyConfig 回灌到各窗口 state。浏览器环境无广播，就地应用。
  function commitConfig(next: AppConfig) {
    writeConfig(JSON.stringify(next)).catch(() => {
      // 写入失败则静默忽略
    })
    if (!isTauriEnv()) applyConfig(next)
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

  // 窗口图标同步：更新显示源（appIconSrc）并把自定义/默认图标设为 OS 窗口图标。
  // 所有窗口都更新显示源；仅主窗口调 setIcon（子窗口保留自身图标）。
  async function applyIcon() {
    const isSub = window.location.pathname.startsWith('/window')
    const key = appIcon.value

    // 浏览器环境：appIcon 是上传时的 objectURL，直接作显示源
    if (!isTauriEnv()) {
      appIconSrc.value = key || '/logo.ico'
      return
    }

    // 取字节：有自定义图标则读文件，否则用打包默认窗口图标（跟随 branding，而非 logo.ico）
    let bytes: Uint8Array | null = null
    if (key) {
      const b = await getAppIcon().catch(() => new Uint8Array())
      if (b.length) bytes = b
    } else if (defaultIconBytes?.length) {
      bytes = defaultIconBytes
    }
    appIconSrc.value = bytes && bytes.length
      ? URL.createObjectURL(new Blob([bytes]))
      : '/logo.ico'

    if (isSub) return

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      if (!bytes) {
        const res = await fetch('/logo.ico')
        bytes = new Uint8Array(await res.arrayBuffer())
      }
      await getCurrentWindow().setIcon(bytes)
    } catch (e) {
      // 图标设置失败不影响主流程
      console.error('[applyIcon]', e)
    }
  }

  // 初始化时先应用主题 class（使用默认值）
  document.documentElement.classList.add(`accent-${accentTheme.value}`)

  // 以下 setter 均不直接改 state，而是提交整份配置到后端，经广播后再回灌生效
  function toggleTheme() {
    commitConfig({ ...snapshotConfig(), isDark: !isDark.value })
  }

  function setLayout(type: LayoutType) {
    commitConfig({ ...snapshotConfig(), layoutType: type })
  }

  function setLocale(lang: string) {
    commitConfig({ ...snapshotConfig(), locale: lang })
  }

  function setAccentTheme(theme: AccentTheme) {
    commitConfig({ ...snapshotConfig(), accentTheme: theme })
  }

  function setSidebarStyle(style: SidebarStyle) {
    commitConfig({ ...snapshotConfig(), sidebarStyle: style })
  }

  function setSkin(value: string) {
    commitConfig({ ...snapshotConfig(), skin: value })
  }

  function setAppTitle(title: string) {
    commitConfig({ ...snapshotConfig(), appTitle: title })
  }

  function setAppIcon(filename: string) {
    commitConfig({ ...snapshotConfig(), appIcon: filename })
  }

  function setCloseBehavior(b: CloseBehavior) {
    commitConfig({ ...snapshotConfig(), closeBehavior: b })
  }

  function setMarkets(list: MarketConfig[]) {
    commitConfig({ ...snapshotConfig(), markets: list })
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
    appIconSrc,
    closeBehavior,
    markets,
    defaultTitle,
    init,
    snapshotConfig,
    toggleTheme,
    setLayout,
    setLocale,
    setAccentTheme,
    setSidebarStyle,
    setSkin,
    setAppTitle,
    setAppIcon,
    setCloseBehavior,
    setMarkets,
  }
})
