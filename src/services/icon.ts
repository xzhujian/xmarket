import { call, inTauri } from './ipc'

// 自定义应用图标以文件形式存到项目 resource_dir/icons/ 目录；
// Tauri 环境用命令存/取字节，不走 HTTP（与插件服务器协议分离，避免跨协议混用）。

/** 上传自定义图标，Tauri 返回保存的文件名，浏览器返回 object URL（仅用于预览） */
export async function uploadIcon(file: File): Promise<string> {
  if (inTauri()) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return call<string>('save_icon', { filename: file.name, data: bytes })
  }
  return URL.createObjectURL(file)
}

/** 读取当前自定义图标字节（Tauri；无自定义图标返回空） */
export async function getAppIcon(): Promise<Uint8Array> {
  if (!inTauri()) return new Uint8Array()
  const arr = await call<number[]>('get_app_icon')
  return Uint8Array.from(arr)
}

/** 删除自定义图标文件（恢复默认时调用） */
export async function deleteIcon(filename: string): Promise<void> {
  if (!inTauri() || !filename) return
  try {
    await call('delete_icon', { filename })
  } catch {
    // 删除失败不影响清空配置
  }
}
