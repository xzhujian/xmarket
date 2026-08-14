use serde::{Deserialize, Serialize};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use zip::write::FileOptions;
use zip::ZipWriter;

// ─── 数据结构 ─────────────────────────────────────────────────

/// manifest.json 完整结构
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub icon: String,
    #[serde(default = "default_display")]
    pub display: String,
    pub entry: ManifestEntry,
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub permissions: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub default_config: Option<serde_json::Value>,
    pub homepage: Option<String>,
    pub license: Option<String>,
}

fn default_display() -> String {
    "default".to_string()
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ManifestEntry {
    pub frontend: String,
    #[serde(default)]
    pub backend: Option<ManifestBackend>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ManifestBackend {
    #[serde(rename = "type")]
    pub backend_type: String,
    #[serde(default)]
    pub windows: Option<String>,
    #[serde(default)]
    pub linux: Option<String>,
    #[serde(default)]
    pub macos: Option<String>,
}

/// 前端使用的插件项
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginItem {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub icon: String,
    pub enabled: bool,
    pub sort_order: i32,
    pub display: String,
    pub entry_html: String,
    pub has_backend: bool,
}

/// 插件状态（持久化到 JSON）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginState {
    pub enabled: bool,
    pub show_on_home: bool,
    pub is_default_page: bool,
    pub sort_order: i32,
    pub display_mode: String,
}

impl Default for PluginState {
    fn default() -> Self {
        Self {
            enabled: true,
            show_on_home: false,
            is_default_page: false,
            sort_order: 0,
            display_mode: "default".to_string(),
        }
    }
}

/// 插件状态表的行结构（用于 sqlx 查询）
#[derive(Debug, sqlx::FromRow)]
struct PluginStateRow {
    plugin_id: String,
    enabled: bool,
    show_on_home: bool,
    is_default_page: bool,
    sort_order: i32,
    display_mode: String,
}

impl From<PluginStateRow> for PluginState {
    fn from(r: PluginStateRow) -> Self {
        Self {
            enabled: r.enabled,
            show_on_home: r.show_on_home,
            is_default_page: r.is_default_page,
            sort_order: r.sort_order,
            display_mode: r.display_mode,
        }
    }
}

// ─── 路径辅助 ─────────────────────────────────────────────────

/// 获取 plugins/ 目录路径
/// Tauri 通过 `tauri.conf.json` 的 `resources` 配置，在构建时将项目根目录的
/// plugins/ 复制到 resource_dir 下。运行时直接读取 resource_dir/plugins/。
fn get_plugins_dir(app: &AppHandle) -> PathBuf {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|e| {
            eprintln!("[plugin_manager] 获取 resource_dir 失败: {}, 回退到当前目录", e);
            PathBuf::from(".")
        });
    resource_dir.join("plugins")
}

/// 获取 plugins-data/ 目录路径
fn get_plugins_data_dir(app: &AppHandle) -> PathBuf {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|e| {
            eprintln!("[plugin_manager] 获取 resource_dir 失败: {}, 回退到当前目录", e);
            PathBuf::from(".")
        });
    let dir = resource_dir.join("plugins-data");
    fs::create_dir_all(&dir).ok();
    dir
}

// ─── 数据库（插件静态状态存于 SQLite，连接池由后端自持）─────

/// 托管给 Tauri 的 sqlite 连接池，后端命令通过它读写数据库
pub struct Db(pub SqlitePool);

/// 数据库文件路径：resource_dir/db/framework.db
fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let dir = resource_dir.join("db");
    fs::create_dir_all(&dir).map_err(|e| format!("创建数据库目录失败: {}", e))?;
    Ok(dir.join("framework.db"))
}

/// 应用启动时初始化数据库：建目录、连池、建表，然后托管给 Tauri。
/// 此后后端命令通过 `app.state::<Db>()` 获取连接池，前端不再直接连库。
pub fn init_db(app: &AppHandle) -> Result<(), String> {
    // 直接用文件路径建连接，绕开 `sqlite:C:\...` 被 url 解析为查询参数的问题
    let options = SqliteConnectOptions::new()
        .filename(db_path(app)?)
        .create_if_missing(true);
    let pool = tauri::async_runtime::block_on(SqlitePoolOptions::new().connect_with(options))
        .map_err(|e| format!("连接数据库失败: {}", e))?;
    tauri::async_runtime::block_on(
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS plugin_states (
                plugin_id       TEXT PRIMARY KEY,
                enabled         INTEGER NOT NULL DEFAULT 1,
                show_on_home    INTEGER NOT NULL DEFAULT 0,
                is_default_page INTEGER NOT NULL DEFAULT 0,
                sort_order      INTEGER NOT NULL DEFAULT 0,
                display_mode    TEXT NOT NULL DEFAULT 'default'
            )",
        )
        .execute(&pool),
    )
    .map_err(|e| format!("创建插件状态表失败: {}", e))?;
    app.manage(Db(pool));
    Ok(())
}

/// 获取后端自持的 sqlite 连接池
fn get_pool(app: &AppHandle) -> SqlitePool {
    app.state::<Db>().0.clone()
}

/// 读取某插件状态（不存在则返回默认）
async fn get_state(pool: &SqlitePool, id: &str) -> Result<PluginState, String> {
    let row = sqlx::query_as::<_, PluginStateRow>(
        "SELECT plugin_id, enabled, show_on_home, is_default_page, sort_order, display_mode
         FROM plugin_states WHERE plugin_id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("读取插件状态失败: {}", e))?;
    Ok(row.map(PluginState::from).unwrap_or_default())
}

/// 读取全部插件状态
async fn load_all_states(pool: &SqlitePool) -> Result<HashMap<String, PluginState>, String> {
    let rows = sqlx::query_as::<_, PluginStateRow>(
        "SELECT plugin_id, enabled, show_on_home, is_default_page, sort_order, display_mode
         FROM plugin_states",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("读取插件状态失败: {}", e))?;
    Ok(rows
        .into_iter()
        .map(|r| (r.plugin_id.clone(), r.into()))
        .collect())
}

/// 新增或更新某插件状态（upsert）
async fn upsert_state(pool: &SqlitePool, id: &str, state: &PluginState) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO plugin_states
           (plugin_id, enabled, show_on_home, is_default_page, sort_order, display_mode)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(plugin_id) DO UPDATE SET
           enabled = excluded.enabled,
           show_on_home = excluded.show_on_home,
           is_default_page = excluded.is_default_page,
           sort_order = excluded.sort_order,
           display_mode = excluded.display_mode",
    )
    .bind(id)
    .bind(state.enabled)
    .bind(state.show_on_home)
    .bind(state.is_default_page)
    .bind(state.sort_order)
    .bind(&state.display_mode)
    .execute(pool)
    .await
    .map_err(|e| format!("写入插件状态失败: {}", e))?;
    Ok(())
}

/// 删除某插件状态
async fn delete_state(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM plugin_states WHERE plugin_id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("删除插件状态失败: {}", e))?;
    Ok(())
}

// ─── 扫描单个插件 ─────────────────────────────────────────────

fn scan_single_plugin(_app: &AppHandle, plugin_dir: &Path, state: &HashMap<String, PluginState>) -> Option<PluginItem> {
    let manifest_path = plugin_dir.join("manifest.json");
    if !manifest_path.exists() {
        return None;
    }

    let content = fs::read_to_string(&manifest_path).ok()?;
    let manifest: PluginManifest = serde_json::from_str(&content).ok()?;

    let plugin_id = manifest.id.clone();
    let plugin_state = state.get(&plugin_id).cloned().unwrap_or_default();

    let entry_html = PathBuf::from(&manifest.entry.frontend);
    let full_entry = plugin_dir.join(&entry_html);

    Some(PluginItem {
        id: plugin_id,
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        icon: manifest.icon,
        enabled: plugin_state.enabled,
        sort_order: plugin_state.sort_order,
        display: manifest.display,
        entry_html: full_entry.to_string_lossy().to_string(),
        has_backend: manifest.entry.backend.is_some(),
    })
}

// ─── Tauri Commands ──────────────────────────────────────────

/// 扫描所有插件
#[tauri::command]
pub async fn scan_plugins(app: AppHandle) -> Result<Vec<PluginItem>, String> {
    let plugins_dir = get_plugins_dir(&app);
    let state = load_all_states(&get_pool(&app)).await?;

    let mut items = Vec::new();

    if !plugins_dir.exists() {
        return Ok(items);
    }

    let entries = fs::read_dir(&plugins_dir).map_err(|e| format!("读取插件目录失败: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(item) = scan_single_plugin(&app, &path, &state) {
                items.push(item);
            }
        }
    }

    // 按 sort_order 排序
    items.sort_by(|a, b| a.sort_order.cmp(&b.sort_order));

    Ok(items)
}

/// 安装插件（解压 zip）
#[tauri::command]
pub async fn install_plugin(app: AppHandle, zip_path: String) -> Result<PluginItem, String> {
    let zip_path = PathBuf::from(&zip_path);
    if !zip_path.exists() {
        return Err("ZIP 文件不存在".to_string());
    }

    let plugins_dir = get_plugins_dir(&app);

    // 打开 zip 文件
    let file = fs::File::open(&zip_path).map_err(|e| format!("无法打开 ZIP 文件: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("无法解析 ZIP 文件: {}", e))?;

    // 先读 manifest.json 获取插件 ID
    let mut manifest_content = String::new();

    // 找到 manifest.json
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).ok();
        if let Some(ref mut entry) = entry {
            let name = entry.name().to_string();
            if name.ends_with("manifest.json") || name == "manifest.json" {
                entry
                    .read_to_string(&mut manifest_content)
                    .map_err(|e| format!("读取 manifest.json 失败: {}", e))?;
                break;
            }
        }
    }

    if manifest_content.is_empty() {
        return Err("ZIP 包中未找到 manifest.json".to_string());
    }

    let manifest: PluginManifest =
        serde_json::from_str(&manifest_content).map_err(|e| format!("manifest.json 格式错误: {}", e))?;

    let plugin_id = manifest.id.clone();
    let target_dir = plugins_dir.join(&plugin_id);

    // 如果已存在，先删除旧的
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir).map_err(|e| format!("删除旧插件目录失败: {}", e))?;
    }

    fs::create_dir_all(&target_dir).map_err(|e| format!("创建插件目录失败: {}", e))?;

    // 解压所有文件
    // 需要重新打开 zip 文件（因为之前的 reader 被消耗了）
    let file = fs::File::open(&zip_path).map_err(|e| format!("无法打开 ZIP 文件: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("无法解析 ZIP 文件: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("读取 ZIP 条目失败: {}", e))?;
        let name = entry.name().to_string();

        // 跳过目录项和 manifest.json 的目录前缀
        // 计算相对路径：去除插件 ID 前缀目录（如果存在）
        let relative = if name.starts_with(&format!("{}/", plugin_id)) {
            name.strip_prefix(&format!("{}/", plugin_id))
                .unwrap_or(&name)
                .to_string()
        } else {
            name.clone()
        };

        if relative.is_empty() || relative.ends_with('/') {
            continue;
        }

        let out_path = target_dir.join(&relative);
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).ok();
        }

        if entry.is_dir() {
            fs::create_dir_all(&out_path).ok();
        } else {
            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("创建文件失败 {}: {}", relative, e))?;
            let mut buffer = Vec::new();
            entry
                .read_to_end(&mut buffer)
                .map_err(|e| format!("读取 ZIP 条目失败: {}", e))?;
            out_file
                .write_all(&buffer)
                .map_err(|e| format!("写入文件失败: {}", e))?;
        }
    }

    // 写入默认配置
    if let Some(default_config) = &manifest.default_config {
        let data_dir = get_plugins_data_dir(&app);
        let plugin_data_dir = data_dir.join(&plugin_id);
        fs::create_dir_all(&plugin_data_dir).ok();

        let config_path = plugin_data_dir.join("config.json");
        if !config_path.exists() {
            if let Ok(json) = serde_json::to_string_pretty(default_config) {
                fs::write(&config_path, &json).ok();
            }
        }
    }

    // 更新状态（新增，默认启用）
    let pool = get_pool(&app);
    upsert_state(
        &pool,
        &plugin_id,
        &PluginState {
            enabled: true,
            ..Default::default()
        },
    )
    .await?;

    // 重新扫描返回
    let state = load_all_states(&pool).await?;
    scan_single_plugin(&app, &target_dir, &state)
        .ok_or_else(|| "安装后扫描插件失败".to_string())
}

/// 打包插件为 zip
#[tauri::command]
pub fn pack_plugin(app: AppHandle, plugin_id: String, output_path: String) -> Result<String, String> {
    let plugins_dir = get_plugins_dir(&app);
    let plugin_dir = plugins_dir.join(&plugin_id);

    if !plugin_dir.exists() {
        return Err(format!("插件 '{}' 不存在", plugin_id));
    }

    let output_path = PathBuf::from(&output_path);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建输出目录失败: {}", e))?;
    }

    let file =
        fs::File::create(&output_path).map_err(|e| format!("创建 ZIP 文件失败: {}", e))?;
    let mut zip = ZipWriter::new(file);

    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    add_dir_to_zip(&mut zip, &plugin_dir, &plugin_dir, &options, &plugin_id)
        .map_err(|e| format!("打包失败: {}", e))?;

    zip.finish().map_err(|e| format!("ZIP 写入失败: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

fn add_dir_to_zip(
    zip: &mut ZipWriter<fs::File>,
    dir: &Path,
    base: &Path,
    options: &FileOptions<'_, ()>,
    plugin_id: &str,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
        let path = entry.path();
        let relative = path
            .strip_prefix(base)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        // 在 zip 中加上插件 ID 前缀目录
        let zip_path = format!("{}/{}", plugin_id, relative);

        if path.is_dir() {
            zip.add_directory(&zip_path, *options)
                .map_err(|e| format!("添加目录到 ZIP 失败: {}", e))?;
            add_dir_to_zip(zip, &path, base, options, plugin_id)?;
        } else {
            zip.start_file(&zip_path, *options)
                .map_err(|e| format!("添加文件到 ZIP 失败: {}", e))?;
            let mut buffer = Vec::new();
            fs::File::open(&path)
                .map_err(|e| format!("打开文件失败: {}", e))?
                .read_to_end(&mut buffer)
                .map_err(|e| format!("读取文件失败: {}", e))?;
            zip.write_all(&buffer)
                .map_err(|e| format!("写入 ZIP 失败: {}", e))?;
        }
    }
    Ok(())
}

/// 卸载插件
#[tauri::command]
pub async fn uninstall_plugin(app: AppHandle, plugin_id: String) -> Result<(), String> {
    let plugins_dir = get_plugins_dir(&app);
    let plugin_dir = plugins_dir.join(&plugin_id);

    if !plugin_dir.exists() {
        return Err(format!("插件 '{}' 不存在", plugin_id));
    }

    // 删除插件源码目录
    fs::remove_dir_all(&plugin_dir)
        .map_err(|e| format!("删除插件目录失败: {}", e))?;

    // 删除插件数据目录
    let data_dir = get_plugins_data_dir(&app);
    let plugin_data_dir = data_dir.join(&plugin_id);
    if plugin_data_dir.exists() {
        fs::remove_dir_all(&plugin_data_dir).ok();
    }

    // 从状态表中移除
    let pool = get_pool(&app);
    delete_state(&pool, &plugin_id).await?;

    Ok(())
}

/// 切换插件启禁状态
#[tauri::command]
pub async fn toggle_plugin(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let pool = get_pool(&app);
    let mut state = get_state(&pool, &id).await?;
    state.enabled = enabled;
    upsert_state(&pool, &id, &state).await
}

/// 保存插件排序
#[tauri::command]
pub async fn set_plugin_sort(app: AppHandle, id: String, sort_order: i32) -> Result<(), String> {
    let pool = get_pool(&app);
    let mut state = get_state(&pool, &id).await?;
    state.sort_order = sort_order;
    upsert_state(&pool, &id, &state).await
}
