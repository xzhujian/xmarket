mod plugin_manager;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            plugin_manager::scan_plugins,
            plugin_manager::install_plugin,
            plugin_manager::pack_plugin,
            plugin_manager::toggle_plugin,
            plugin_manager::uninstall_plugin,
            read_config,
            write_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
