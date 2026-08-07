import { call, onEvent, inTauri } from './ipc'
import type { UnlistenFn } from '@tauri-apps/api/event'

export interface AppConfig {
  layoutType: string
  isDark: boolean
  locale: string
  accentTheme: string
  sidebarStyle: string
  skin: string
}

/** 从文件读取配置 */
export async function readConfig(): Promise<string> {
  return call<string>('read_config')
}

/** 写入配置到文件 */
export async function writeConfig(content: string): Promise<void> {
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
