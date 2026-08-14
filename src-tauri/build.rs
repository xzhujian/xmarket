fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "scan_plugins",
                "install_plugin",
                "pack_plugin",
                "toggle_plugin",
                "uninstall_plugin",
                "plugin_invoke",
                "plugin_exit",
                "get_plugin_server_port",
                "get_plugin_server_url",
                "read_config",
                "write_config",
                "read_window_state",
                "write_window_state",
                "save_skin",
                "list_skins",
                "delete_skin",
            ]),
        ),
    )
    .expect("failed to build tauri application");
}
