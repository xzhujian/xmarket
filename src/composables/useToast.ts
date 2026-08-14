import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

const toasts = ref<ToastItem[]>([])
let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const DEFAULT_DURATION = 3000

const colorMap: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

export function useToast() {
  function add(type: ToastType, message: string, duration?: number) {
    const id = nextId++
    const toast: ToastItem = { id, type, message, duration: duration ?? DEFAULT_DURATION }
    toasts.value = [...toasts.value, toast]
    startTimer(id, toast.duration)
  }

  function startTimer(id: number, duration: number) {
    if (duration > 0) {
      const timer = setTimeout(() => remove(id), duration)
      timers.set(id, timer)
    }
  }

  function remove(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  /** 鼠标移入：暂停计时 */
  function pause(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  /** 鼠标移出：恢复计时（剩余时长） */
  function resume(id: number) {
    const toast = toasts.value.find(t => t.id === id)
    if (toast && toast.duration > 0) {
      startTimer(id, toast.duration)
    }
  }

  function success(message: string) { add('success', message) }
  function error(message: string) { add('error', message) }
  function warning(message: string) { add('warning', message) }
  function info(message: string) { add('info', message) }

  return { toasts, add, remove, pause, resume, success, error, warning, info, colorMap }
}
