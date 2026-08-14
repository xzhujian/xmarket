mod plugin_manager;
mod plugin_permission;
mod plugin_runtime;
mod plugin_server;
mod settings;
mod system;

use std::fs;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(system::on_window_event)
        .setup(|app| {
            // 启动本地 HTTP 服务器（服务插件目录 + 皮肤目录）
            if let Ok(resource_dir) = app.path().resource_dir() {
                let plugins_dir = resource_dir.join("plugins");
                let skins_dir = resource_dir.join("skins");
                fs::create_dir_all(&skins_dir).ok();
                plugin_server::start(vec![plugins_dir, skins_dir]);
            }

            // 系统托盘
            system::build_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── 插件部分 ──
            plugin_manager::scan_plugins,
            plugin_manager::install_plugin,
            plugin_manager::pack_plugin,
            plugin_manager::toggle_plugin,
            plugin_manager::uninstall_plugin,
            plugin_permission::plugin_invoke,
            plugin_runtime::plugin_exit,
            plugin_server::get_plugin_server_port,
            plugin_server::get_plugin_server_url,

            // ── 设置部分 ──
            settings::read_config,
            settings::write_config,
            settings::read_window_state,
            settings::write_window_state,
            settings::save_skin,
            settings::list_skins,
            settings::delete_skin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
