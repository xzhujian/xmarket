mod plugin_manager;
mod plugin_permission;
mod plugin_runtime;
mod plugin_server;
mod settings;
mod system;
mod updater;

use std::fs;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        // 单实例:重复启动时不再新开进程,而是唤醒/聚焦已有实例的主窗口
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            system::set_all_windows_visible(app, true);
        }))
        .on_window_event(system::on_window_event)
        .setup(|app| {
            // 初始化数据库（后端自持连接池，插件状态存于此）
            plugin_manager::init_db(app.handle())?;

            // 启动本地 HTTP 服务器（nginx 式按插件子域名路由；自定义图标经命令返回字节，不走 HTTP）
            if let Ok(resource_dir) = app.path().resource_dir() {
                let skins_dir = resource_dir.join("skins");
                fs::create_dir_all(&skins_dir).ok();
                plugin_server::start(resource_dir);
            }

            // 系统托盘
            system::build_tray(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── 插件部分 ──
            plugin_manager::scan_plugins,
            plugin_manager::install_plugin,
            plugin_manager::save_market_zip,
            plugin_manager::pack_plugin,
            plugin_manager::toggle_plugin,
            plugin_manager::set_plugin_sort,
            plugin_manager::uninstall_plugin,
            plugin_permission::plugin_invoke,
            plugin_runtime::plugin_exit,
            plugin_server::get_plugin_server_port,
            plugin_server::get_plugin_server_url,
            plugin_server::create_plugin_webview,
            plugin_server::create_plugin_window,
            plugin_server::restore_main_window,

            // ── 设置部分 ──
            settings::read_config,
            settings::write_config,
            settings::read_window_state,
            settings::write_window_state,
            settings::save_skin,
            settings::list_skins,
            settings::delete_skin,
            settings::save_icon,
            settings::get_app_icon,
            settings::delete_icon,
            settings::get_app_defaults,

            // ── 自升级 ──
            updater::apply_update,
            updater::get_update_status,
            updater::fetch_version_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
