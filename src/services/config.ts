import { call, onEvent, inTauri } from './ipc'
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { MarketConfig } from '@/constants/markets'

// 浏览器环境的配置存储键（localStorage 兜底，与 Tauri 的 app-config.json 同一份 JSON）
const STORAGE_KEY = 'app-config'

export interface AppConfig {
  layoutType: string
  isDark: boolean
  locale: string
  accentTheme: string
  sidebarStyle: string
  skin: string
  appTitle: string
  appIcon: string
  closeBehavior: string
  markets: MarketConfig[]
}

/** 从文件读取配置（浏览器环境用 localStorage 兜底，保证预览时也能持久化） */
export async function readConfig(): Promise<string> {
  if (!inTauri()) return localStorage.getItem(STORAGE_KEY) ?? ''
  return call<string>('read_config')
}

/** 写入配置到文件（浏览器环境写入 localStorage） */
export async function writeConfig(content: string): Promise<void> {
  if (!inTauri()) {
    localStorage.setItem(STORAGE_KEY, content)
    return
  }
  return call('write_config', { content })
}

/** 监听配置变更（来自其他窗口） */
export function onConfigChanged(handler: (config: AppConfig) => void): Promise<UnlistenFn> {
  return onEvent<AppConfig>('config-changed', handler)
}

/** 检查是否为 Tauri 环境 */
export function isTauriEnv(): boolean {
  return inTauri()
}

export interface AppDefaults {
  name: string
  icon: number[]
}

/** 获取当前应用的默认名称与默认图标(同一安装包内固定,来自打包品牌 branding.json)。浏览器环境返回 null。 */
export async function getAppDefaults(): Promise<AppDefaults | null> {
  if (!inTauri()) return null
  return call<AppDefaults>('get_app_defaults')
}
