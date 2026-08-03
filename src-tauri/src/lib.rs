mod plugin_manager;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
