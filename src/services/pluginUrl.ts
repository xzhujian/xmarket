import { call } from '@/services/ipc'

/** 解析插件入口 URL：网络型直接用远程地址；本地型转成插件虚拟主机地址。内嵌与独立窗口共用 */
export async function resolvePluginUrl(entryHtml: string, entryUrl: string | null): Promise<string> {
  if (entryUrl) return entryUrl
  try {
    return await call<string>('get_plugin_server_url', { entryHtml })
  } catch {
    return ''
  }
}