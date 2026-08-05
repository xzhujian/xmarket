import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** 调用 Tauri 后端命令 */
export async function call<T = void>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) throw new Error('Not in Tauri environment')
  return invoke<T>(cmd, args)
}

/** 监听 Tauri 后端事件 */
export function onEvent<T = unknown>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload))
}

/** 检查是否在 Tauri 环境中 */
export function inTauri(): boolean {
  return isTauri
}
