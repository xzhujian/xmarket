// 插件运行态（方案 B：后端命令执行器 + 转发）
//
// 插件运行状态一律由前端 runtime store 登记管理，后端不维护任何运行态表。
// 本文件只提供「需要告知主窗口」的转发命令：插件调命令，后端收到后 emit
// 事件推给主窗口，由主窗口去调用自己的功能（关闭/切换等）。

use tauri::{AppHandle, Emitter};

/// 插件请求退出：通知宿主主窗口关闭插件视图。
///
/// 这是「插件(remote 子 webview) → 自定义命令 → 后端转发 → 主窗口」链路的入口：
/// 插件页面调用本命令后，宿主主窗口订阅到 `plugin-exit` 事件即可关闭插件视图。
#[tauri::command]
pub fn plugin_exit(app: AppHandle, plugin_id: String) -> Result<(), String> {
    let _ = app.emit("plugin-exit", &plugin_id);
    Ok(())
}
