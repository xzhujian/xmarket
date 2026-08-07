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

/// 保存自定义皮肤图片到资源目录 skins/ 下，返回可用的本地 HTTP URL
#[tauri::command]
fn save_skin(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<String, String> {
    let port = plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let skins_dir = resource_dir.join("skins");
    fs::create_dir_all(&skins_dir).map_err(|e| format!("创建皮肤目录失败: {}", e))?;

    // 只保留合法图片扩展名，杜绝路径穿越/任意文件类型
    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .filter(|s| s == "png" || s == "jpg" || s == "jpeg" || s == "webp" || s == "gif")
        .unwrap_or_else(|| "png".to_string());

    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let file_name = format!("custom_{}.{}", millis, ext);
    let dest = skins_dir.join(&file_name);
    fs::write(&dest, &data).map_err(|e| format!("写入皮肤文件失败: {}", e))?;

    // skins_dir 作为静态根目录直接服务，文件即位于 URL 根下，故不带 /skins/ 前缀
    Ok(format!("http://127.0.0.1:{}/{}", port, file_name))
}

/// 列出已上传的自定义皮肤（skins/ 下 custom_* 文件）的 URL
#[tauri::command]
fn list_skins(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let port = plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let skins_dir = resource_dir.join("skins");
    let mut files: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(&skins_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("custom_") {
                files.push(format!("http://127.0.0.1:{}/{}", port, name));
            }
        }
    }
    files.sort();
    Ok(files)
}

/// 删除一个自定义皮肤文件（仅允许删除 custom_* 文件，杜绝删除默认皮肤或其他文件）
#[tauri::command]
fn delete_skin(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| n.starts_with("custom_"))
        .ok_or_else(|| "非法文件名".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let skins_dir = resource_dir.join("skins");
    let path = skins_dir.join(name);
    if let Ok(canonical) = path.canonicalize() {
        if canonical.starts_with(&skins_dir) {
            fs::remove_file(&canonical).map_err(|e| format!("删除皮肤失败: {}", e))?;
        }
    }
    Ok(())
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

                // 启动本地 HTTP 服务器（服务插件目录 + 皮肤目录）
                let skins_dir = resource_dir.join("skins");
                fs::create_dir_all(&skins_dir).ok();
                plugin_server::start(vec![plugins_dir, skins_dir]);
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
            save_skin,
            list_skins,
            delete_skin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
