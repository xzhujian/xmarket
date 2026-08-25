//! 自升级:下载 updater.exe → 拉起它(由 updater 下载新 exe、终止主程序、替换、重启)。
//! 只更新主程序 exe;插件/数据/配置都在 resources,由用户自留,不动。

use std::fs;
use std::io::Read;
use serde::Deserialize;

/// 远端 version.json 的结构(键名与 version.json 一致,走 camelCase)
#[derive(Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteVersion {
    pub version: String,
    pub url: String,
    pub updater_url: Option<String>,
    pub min_version: Option<String>,
}

/// updater 状态文件的路径(与 updater.exe 写的是同一个文件)
fn status_path() -> std::path::PathBuf {
    std::env::temp_dir().join("framework-update-status.json")
}

/// 用 ureq 拉取 version.json 并解析成结构化数据,返回 JSON 字符串给前端。
/// 前端不走 fetch(跨域会被浏览器 CORS 拦截,Gitee raw 不带 Access-Control-Allow-Origin),
/// 统一改由 Rust 侧拉取——与下载 updater/exe 走 ureq 的路径一致,无 CORS 限制。
#[tauri::command]
pub fn fetch_version_json(version_url: String) -> Result<String, String> {
    let resp = ureq::get(&version_url)
        .call()
        .map_err(|e| format!("拉取版本信息失败: {}", e))?;
    let mut bytes = Vec::new();
    resp.into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| format!("读取版本信息失败: {}", e))?;
    let text = String::from_utf8(bytes).map_err(|e| format!("版本信息编码错误: {}", e))?;
    let info: RemoteVersion =
        serde_json::from_str(&text).map_err(|e| format!("版本信息格式错误: {}", e))?;
    serde_json::to_string(&info).map_err(|e| format!("序列化失败: {}", e))
}

/// 从 updaterUrl 下载 updater.exe 到临时目录,拉起它准备执行升级。
/// updater 会自己下载新 exe;任何下载失败都由 updater 写 error 状态并退出,
/// 主程序通过 get_update_status 感知后可继续运行、重试。
#[tauri::command]
pub fn apply_update(
    updater_url: String,
    version_url: String,
) -> Result<(), String> {
    // 1. 下载 updater.exe(小而快,主程序负责拉它)
    let resp = ureq::get(&updater_url)
        .call()
        .map_err(|e| format!("下载更新助手失败: {}", e))?;
    let mut bytes = Vec::new();
    resp.into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| format!("读取更新助手失败: {}", e))?;
    if bytes.is_empty() {
        return Err("下载的更新助手为空".to_string());
    }

    let updater_exe = std::env::temp_dir().join("framework-updater.exe");
    fs::write(&updater_exe, &bytes).map_err(|e| format!("写入更新助手失败: {}", e))?;

    // 2. 当前主程序 exe 路径与自身 PID
    let current_exe =
        std::env::current_exe().map_err(|e| format!("获取当前程序路径失败: {}", e))?;
    let pid = std::process::id().to_string();

    // 3. 清空状态文件,标记开始;拉起 updater(独立进程),随后主程序只转圈等待
    fs::write(status_path(), r#"{"phase":"downloading"}"#).ok();
    let _ = std::process::Command::new(&updater_exe)
        .arg(&current_exe)
        .arg(&pid)
        .arg(&version_url)
        .spawn()
        .map_err(|e| format!("启动更新助手失败: {}", e))?;

    Ok(())
}

/// 读取 updater 当前进度状态,供前端轮询做失败恢复。
/// 返回 "idle"(未在更新)/ "downloading" / "ready" / "error" 之一(或 error 时带 message)。
#[tauri::command]
pub fn get_update_status() -> String {
    fs::read_to_string(status_path()).unwrap_or_else(|_| r#"{"phase":"idle"}"#.to_string())
}
