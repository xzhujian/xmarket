use crate::plugin_server;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

// ─── 资源目录下 json 文件读写辅助 ─────────────────────────────

fn json_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    Ok(resource_dir.join(name))
}

fn read_json_file(app: &AppHandle, name: &str) -> Result<String, String> {
    let path = json_path(app, name)?;
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("读取 {} 失败: {}", name, e))
    } else {
        Ok(String::new())
    }
}

fn write_json_file(app: &AppHandle, name: &str, content: &str) -> Result<(), String> {
    let path = json_path(app, name)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("写入 {} 失败: {}", name, e))
}

// ─── 配置（app-config.json）───────────────────────────────────

/// 读取应用配置文件（app-config.json）
#[tauri::command]
pub fn read_config(app: AppHandle) -> Result<String, String> {
    read_json_file(&app, "app-config.json")
}

/// 写入应用配置文件（app-config.json）
#[tauri::command]
pub fn write_config(app: AppHandle, content: String) -> Result<(), String> {
    write_json_file(&app, "app-config.json", &content)?;

    // 广播配置变更给所有窗口（解析为 JSON Value 以确保前端收到对象而非字符串）
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        app.emit("config-changed", &val).ok();
    }
    Ok(())
}

// ─── 窗口状态（window-state.json）─────────────────────────────

/// 读取窗口状态(window-state.json)
#[tauri::command]
pub fn read_window_state(app: AppHandle) -> Result<String, String> {
    read_json_file(&app, "window-state.json")
}

/// 写入窗口状态(window-state.json)
#[tauri::command]
pub fn write_window_state(app: AppHandle, content: String) -> Result<(), String> {
    write_json_file(&app, "window-state.json", &content)
}

// ─── 皮肤（skins/ 目录）───────────────────────────────────────

/// 保存自定义皮肤图片到资源目录 skins/ 下，返回可用的本地 HTTP URL
#[tauri::command]
pub fn save_skin(app: AppHandle, filename: String, data: Vec<u8>) -> Result<String, String> {
    let port = plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let skins_dir = json_path(&app, "skins")?;
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
pub fn list_skins(app: AppHandle) -> Result<Vec<String>, String> {
    let port = plugin_server::get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let skins_dir = json_path(&app, "skins")?;
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
pub fn delete_skin(app: AppHandle, filename: String) -> Result<(), String> {
    let name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| n.starts_with("custom_"))
        .ok_or_else(|| "非法文件名".to_string())?;
    let skins_dir = json_path(&app, "skins")?;
    let path = skins_dir.join(name);
    if let Ok(canonical) = path.canonicalize() {
        if canonical.starts_with(&skins_dir) {
            fs::remove_file(&canonical).map_err(|e| format!("删除皮肤失败: {}", e))?;
        }
    }
    Ok(())
}

// ─── 自定义应用图标（icons/ 目录，字节经命令返回，不走 HTTP）──

/// 保存自定义应用图标到资源目录 icons/ 下，返回文件名（空配置时用默认 logo）。
/// 统一解码 → 压缩到 256px → 转 PNG，保证 setIcon 可解码且体积可控。
#[tauri::command]
pub fn save_icon(app: AppHandle, _filename: String, data: Vec<u8>) -> Result<String, String> {
    let icons_dir = json_path(&app, "icons")?;
    fs::create_dir_all(&icons_dir).map_err(|e| format!("创建图标目录失败: {}", e))?;

    // 解码上传的任意图片（png/jpeg/webp/gif/ico）
    let img = image::load_from_memory(&data).map_err(|e| format!("图标解码失败: {}", e))?;

    // 尺寸过大则等比压缩到 256px 内
    const MAX: u32 = 256;
    let (w, h) = (img.width(), img.height());
    let img = if w > MAX || h > MAX {
        if w >= h {
            img.thumbnail(MAX, ((MAX as f32 * h as f32) / w as f32).round() as u32)
        } else {
            img.thumbnail(((MAX as f32 * w as f32) / h as f32).round() as u32, MAX)
        }
    } else {
        img
    };

    // 统一转成 PNG
    let mut buf = Vec::new();
    {
        let mut cursor = std::io::Cursor::new(&mut buf);
        img.write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("图标转 PNG 失败: {}", e))?;
    }

    // 清理旧的自定义图标，避免堆积
    if let Ok(entries) = fs::read_dir(&icons_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("appicon_") {
                let _ = fs::remove_file(entry.path());
            }
        }
    }

    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let file_name = format!("appicon_{}.png", millis);
    let dest = icons_dir.join(&file_name);
    fs::write(&dest, &buf).map_err(|e| format!("写入图标文件失败: {}", e))?;

    Ok(file_name)
}

/// 读取当前自定义应用图标字节（无自定义图标则返回空）
#[tauri::command]
pub fn get_app_icon(app: AppHandle) -> Result<Vec<u8>, String> {
    let icons_dir = json_path(&app, "icons")?;
    if let Ok(entries) = fs::read_dir(&icons_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("appicon_") {
                return fs::read(entry.path()).map_err(|e| format!("读取图标失败: {}", e));
            }
        }
    }
    Ok(Vec::new())
}

/// 删除自定义应用图标文件（仅允许删除 appicon_ 文件）
#[tauri::command]
pub fn delete_icon(app: AppHandle, filename: String) -> Result<(), String> {
    let name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| n.starts_with("appicon_"))
        .ok_or_else(|| "非法文件名".to_string())?;
    let icons_dir = json_path(&app, "icons")?;
    let path = icons_dir.join(name);
    if let Ok(canonical) = path.canonicalize() {
        if canonical.starts_with(&icons_dir) {
            fs::remove_file(&canonical).map_err(|e| format!("删除图标失败: {}", e))?;
        }
    }
    Ok(())
}

/// 当前应用的默认名称与默认图标(同一安装包内固定,由打包品牌 branding.json 决定)。
/// 名称 = 打包 productName;图标 = 内嵌窗口图标(RGBA 转 PNG),与 exe/系统窗口图标一致。
#[derive(serde::Serialize)]
pub struct AppDefaults {
    name: String,
    icon: Vec<u8>,
}

#[tauri::command]
pub fn get_app_defaults(app: AppHandle) -> Result<AppDefaults, String> {
    let name = app.package_info().name.to_string();
    let mut icon = Vec::new();
    if let Some(img) = app.default_window_icon() {
        let (w, h) = (img.width(), img.height());
        let buf = image::RgbaImage::from_raw(w, h, img.rgba().to_vec())
            .ok_or_else(|| "图标像素解码失败".to_string())?;
        let mut cursor = std::io::Cursor::new(&mut icon);
        image::DynamicImage::ImageRgba8(buf)
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|e| format!("图标转 PNG 失败: {}", e))?;
    }
    Ok(AppDefaults { name, icon })
}
