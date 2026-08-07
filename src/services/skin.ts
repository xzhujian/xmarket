import { call, inTauri } from './ipc'

// 默认皮肤（public/skins 下的图片，随应用打包）
export const DEFAULT_SKINS = [
  { id: 'bg1', path: '/skins/bg1.png' },
  { id: 'bg3', path: '/skins/bg3.png' },
  { id: 'bg5', path: '/skins/bg5.png' },
  { id: 'bg6', path: '/skins/bg6.png' },
  { id: 'bg7', path: '/skins/bg7.png' },
]

/**
 * 上传自定义皮肤图片，返回可用于 CSS 背景的 URL。
 * Tauri 环境：将文件字节保存到后端 skins 目录并返回本地 HTTP URL；
 * 浏览器环境（开发预览）：直接用 object URL 引用。
 */
export async function uploadSkin(file: File): Promise<string> {
  if (inTauri()) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return call<string>('save_skin', { filename: file.name, data: bytes })
  }
  return URL.createObjectURL(file)
}

/** 列出已上传的自定义皮肤 URL（Tauri 环境），浏览器环境返回空 */
export async function listCustomSkins(): Promise<string[]> {
  if (!inTauri()) return []
  try {
    return await call<string[]>('list_skins')
  } catch {
    return []
  }
}

/** 删除一个自定义皮肤（按其 URL） */
export async function deleteCustomSkin(url: string): Promise<void> {
  if (!inTauri()) return
  const filename = url.split('/').pop() ?? url
  await call('delete_skin', { filename })
}
