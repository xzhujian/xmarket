// 自定义应用图标以 data URL（base64）形式存进配置；空 = 用默认 logo。
// 用 data URL 而非本地文件/HTTP 地址，是为了完全摆脱随机端口与后端依赖，
// 浏览器和 Tauri 环境逻辑一致，重启后（配置持久化）也能恢复显示。

/** 读取图片文件并转为 data URL 返回（存进 appIcon 配置） */
export async function uploadIcon(file: File): Promise<string> {
  return await readFileAsDataURL(file)
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
