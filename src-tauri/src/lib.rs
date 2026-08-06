mod plugin_manager;
mod plugin_server;

use std::fs;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    Ok(resource_dir.join("app-config.json"))
}

/// 读取应用配置文件（app-config.json）
#[tauri::command]
fn read_config(app: tauri::AppHandle) -> Result<String, String> {
    let config_path = get_config_path(&app)?;
    if config_path.exists() {
        fs::read_to_string(&config_path).map_err(|e| format!("读取配置失败: {}", e))
    } else {
        Ok(String::new())
    }
}

/// 写入应用配置文件（app-config.json）
#[tauri::command]
fn write_config(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    fs::write(&config_path, &content).map_err(|e| format!("写入配置失败: {}", e))?;

    // 广播配置变更给所有窗口（解析为 JSON Value 以确保前端收到对象而非字符串）
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        app.emit("config-changed", &val).ok();
    }
    Ok(())
}

/// 获取插件 HTTP 服务器的端口号
#[tauri::command]
fn get_plugin_server_port() -> Result<u16, String> {
    plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())
}

/// 将插件入口 HTML 路径转为 HTTP 服务器 URL
#[tauri::command]
fn get_plugin_server_url(app: tauri::AppHandle, entry_html: String) -> Result<String, String> {
    let port = plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let plugins_dir = resource_dir.join("plugins");
    let entry_path = std::path::PathBuf::from(&entry_html);
    let relative = entry_path
        .strip_prefix(&plugins_dir)
        .map_err(|_| format!("插件路径不在插件目录下: {}", entry_html))?;
    let relative_str = relative.to_string_lossy().replace('\\', "/");
    Ok(format!("http://127.0.0.1:{}/{}", port, relative_str))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 调试：输出 resource_dir 和 plugins_dir 的实际路径
            if let Ok(resource_dir) = app.path().resource_dir() {
                let plugins_dir = resource_dir.join("plugins");
                eprintln!("[debug] resource_dir = {:?}", resource_dir);
                eprintln!("[debug] plugins_dir = {:?}", plugins_dir);
                eprintln!("[debug] plugins_dir.exists() = {}", plugins_dir.exists());
                if plugins_dir.exists() {
                    if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
                        for entry in entries.flatten() {
                            eprintln!("[debug]   plugin entry: {:?}", entry.path());
                        }
                    }
                }

                // 启动插件 HTTP 服务器
                plugin_server::start(plugins_dir);
                let port = plugin_server::get_port().unwrap_or(0);
                eprintln!("[debug] plugin_server port = {}", port);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            plugin_manager::scan_plugins,
            plugin_manager::install_plugin,
            plugin_manager::pack_plugin,
            plugin_manager::toggle_plugin,
            plugin_manager::uninstall_plugin,
            read_config,
            write_config,
            get_plugin_server_port,
            get_plugin_server_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
