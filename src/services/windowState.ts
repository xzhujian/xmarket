import { call, inTauri } from './ipc'
import { getCurrentWindow, availableMonitors, primaryMonitor } from '@tauri-apps/api/window'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi'

export interface RectLike {
  x: number
  y: number
  width: number
  height: number
}

export interface MonitorLike {
  position: { x: number; y: number }
  size: { width: number; height: number }
}

interface WindowRect extends RectLike {
  /** 关闭时是否处于最大化;存的是还原态(正常)尺寸,最大化只是状态标记 */
  maximized?: boolean
}

/** 窗口几何与显示器坐标都是物理像素,边界检测无需换算 */

async function readWindowState(): Promise<WindowRect | null> {
  if (!inTauri()) return null
  const content = await call<string>('read_window_state').catch(() => '')
  if (!content) return null
  try {
    const v = JSON.parse(content) as WindowRect
    if (
      typeof v?.x === 'number' &&
      typeof v?.y === 'number' &&
      typeof v?.width === 'number' &&
      typeof v?.height === 'number' &&
      v.width > 0 &&
      v.height > 0
    ) {
      return v
    }
  } catch { /* 忽略坏数据 */ }
  return null
}

async function writeWindowState(rect: WindowRect): Promise<void> {
  if (!inTauri()) return
  await call('write_window_state', { content: JSON.stringify(rect) }).catch(() => {})
}

/** 关闭时记录一次窗口位置与大小(及是否最大化) */
export async function captureWindowState(): Promise<void> {
  if (!inTauri()) return
  try {
    const win = getCurrentWindow()
    const maximized = await win.isMaximized()
    if (maximized) {
      // 最大化时读到的 outerSize 是最大化尺寸;先还原再读,拿到正常尺寸,随即恢复最大化。
      // 发生在隐藏/退出前一刻,短暂闪烁基本不可见。
      await win.unmaximize()
      const pos = await win.outerPosition()
      const size = await win.outerSize()
      await win.maximize()
      await writeWindowState({ x: pos.x, y: pos.y, width: size.width, height: size.height, maximized: true })
    } else {
      const pos = await win.outerPosition()
      const size = await win.outerSize()
      await writeWindowState({ x: pos.x, y: pos.y, width: size.width, height: size.height, maximized: false })
    }
  } catch { /* 记录失败不影响关闭流程 */ }
}

/** 保存的矩形是否完整落在某个显示器内;任一部分超出所有屏幕即视为丢失 → 需初始化居中 */
export function isFullyOnAnyMonitor(rect: RectLike, monitors: MonitorLike[]): boolean {
  return monitors.some((m) => {
    return (
      rect.x >= m.position.x &&
      rect.y >= m.position.y &&
      rect.x + rect.width <= m.position.x + m.size.width &&
      rect.y + rect.height <= m.position.y + m.size.height
    )
  })
}

/**
 * 计算最终要应用的窗口位置与尺寸:
 *  - 完整落在某个显示器内 → 原样恢复
 *  - 任一部分在屏外 → 主屏居中(初始化)+ 尺寸钳制到主屏
 */
export function computeRestoreBounds(
  saved: RectLike,
  monitors: MonitorLike[],
  primary: MonitorLike | null,
): { x: number; y: number; width: number; height: number } {
  if (isFullyOnAnyMonitor(saved, monitors)) {
    return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
  }
  if (!primary) return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
  const px = primary.position.x
  const py = primary.position.y
  const pw = primary.size.width
  const ph = primary.size.height
  const width = Math.min(saved.width, pw)
  const height = Math.min(saved.height, ph)
  return {
    x: px + Math.round((pw - width) / 2),
    y: py + Math.round((ph - height) / 2),
    width,
    height,
  }
}

/** 启动时恢复窗口位置与大小;超出所有屏幕则主屏居中 + 尺寸钳制到主屏 */
export async function restoreWindowState(): Promise<void> {
  if (!inTauri()) return
  const win = getCurrentWindow()
  const saved = await readWindowState()
  if (saved) {
    try {
      const monitors = await availableMonitors()
      const pm = (await primaryMonitor()) ?? null
      const { x, y, width, height } = computeRestoreBounds(saved, monitors, pm)
      await win.setPosition(new PhysicalPosition(x, y))
      await win.setSize(new PhysicalSize(width, height))
      // 若之前最大化,先设回正常尺寸再最大化,取消最大化即回到正常尺寸,不会卡在满屏
      if (saved.maximized) {
        await win.maximize()
      }
    } catch { /* 恢复失败则用默认窗口状态 */ }
  }
  // 主窗口以隐藏方式创建(避免"初始尺寸→恢复尺寸"闪动),恢复到位后再显示并聚焦到前台
  await win.show().catch(() => {})
  await win.setFocus().catch(() => {})
  // 程序化 setPosition/setSize 不会触发页面的 resize 事件(手动拖拽窗口才会)。
  // 这里在下一帧(布局已按恢复后尺寸落定)显式派发一次 resize，让依赖窗口尺寸的组件(如图表)重排。
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
}
