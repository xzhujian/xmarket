import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type LayoutType = '1' | '2' | '3'
export type AccentTheme = 'teal' | 'blue' | 'purple' | 'orange' | 'rose'

export const useAppStore = defineStore('app', () => {
  const layoutType = ref<LayoutType>('1')
  const isDark = ref(false)
  const locale = ref('zh-CN')
  const sidebarCollapsed = ref(false)
  const accentTheme = ref<AccentTheme>('teal')

  // 从 localStorage 恢复
  const saved = localStorage.getItem('app-config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      layoutType.value = config.layoutType || '1'
      isDark.value = config.isDark || false
      locale.value = config.locale || 'zh-CN'
      accentTheme.value = config.accentTheme || 'teal'
    } catch {}
  }

  // 初始化时应用主题 class
  document.documentElement.classList.add(`accent-${accentTheme.value}`)

  watch([layoutType, isDark, locale, accentTheme], () => {
    localStorage.setItem('app-config', JSON.stringify({
      layoutType: layoutType.value,
      isDark: isDark.value,
      locale: locale.value,
      accentTheme: accentTheme.value,
    }))
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')

    // 切换主题 class
    document.documentElement.className = document.documentElement.className
      .split(' ')
      .filter(c => !c.startsWith('accent-'))
      .concat(`accent-${accentTheme.value}`)
      .join(' ')
  }, { deep: true })

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

  return {
    layoutType,
    isDark,
    locale,
    sidebarCollapsed,
    accentTheme,
    toggleTheme,
    setLayout,
    setLocale,
    setAccentTheme,
  }
})
