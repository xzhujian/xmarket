import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * 调试面板 Store
 * 开发模式（import.meta.env.DEV = true）时正常工作，
 * 生产模式时所有方法为空函数，零内存开销。
 */

const isDev = typeof window !== 'undefined' && import.meta.env.DEV

export const useDebugStore = defineStore('debug', () => {
  // ========== 状态 ==========
  const logs = ref<LogEntry[]>([])
  const maxLogs = ref(200)

  // ========== 计算属性 ==========
  const logText = computed(() =>
    logs.value.map(l => `[${l.level}] ${l.message}`).join('\n')
  )
  const hasLogs = computed(() => logs.value.length > 0)

  // ========== 内部方法 ==========
  function _add(message: string, level: LogLevel, meta?: Record<string, unknown>) {
    if (!isDev) return
    logs.value.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toLocaleTimeString(),
      message,
      level,
      meta,
    })
    if (logs.value.length > maxLogs.value) {
      logs.value = logs.value.slice(0, maxLogs.value)
    }
  }

  // ========== 公开方法 ==========

  /** 普通信息 */
  function info(message: string) {
    _add(message, 'info')
  }

  /** 警告 */
  function warn(message: string) {
    _add(message, 'warn')
  }

  /** 错误 */
  function error(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    _add(msg, 'error')
  }

  /** 状态快照 */
  function state(storeName: string, data: Record<string, unknown>) {
    if (!isDev) return
    const lines = Object.entries(data).map(([key, value]) => {
      const val = typeof value === 'string' ? `"${value}"` : String(value)
      return `  ${key} = ${val}`
    })
    _add(`${storeName}:\n${lines.join('\n')}`, 'state')
  }

  /** 清空 */
  function clear() {
    if (!isDev) return
    logs.value = []
  }

  return {
    logs,
    maxLogs,
    logText,
    hasLogs,
    info,
    warn,
    error,
    state,
    clear,
  }
})

// ========== 类型定义 ==========
export type LogLevel = 'info' | 'warn' | 'error' | 'state'

export interface LogEntry {
  id: string
  time: string
  message: string
  level: LogLevel
  meta?: Record<string, unknown>
}
