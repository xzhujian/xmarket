import { call, inTauri } from './ipc'

// 默认皮肤（public/skins/builtin 下的图片，随应用打包，只读不可删改）
// 命名规范：skin-<NN>.png；自定义皮肤才是 resource_dir/skins 下可直接管理的 custom_* 文件
export const DEFAULT_SKINS = [
  { id: 'skin-01', path: '/skins/builtin/skin-01.png' },
  { id: 'skin-03', path: '/skins/builtin/skin-03.png' },
  { id: 'skin-05', path: '/skins/builtin/skin-05.png' },
  { id: 'skin-06', path: '/skins/builtin/skin-06.png' },
  { id: 'skin-07', path: '/skins/builtin/skin-07.png' },
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
