use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

/// 关闭拦截：main 窗口收到关闭请求时阻止并通知前端按配置决策（隐藏/退出/弹窗）
pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == "main" {
            api.prevent_close();
            let _ = window.emit("close-requested", ());
        }
    }
}

/// 构建系统托盘：左键 toggle 窗口，右键弹出 打开/退出 菜单
pub fn build_tray(app: &tauri::App) -> tauri::Result<TrayIcon> {
    let show = MenuItem::with_id(app, "tray-show", "打开", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray-quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().cloned().expect("缺少默认窗口图标"))
        .menu(&menu)
        .tooltip("企与星河")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray-show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "tray-quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Windows 一次左键会派发 Down+Up 两个 Click，只处理 Up 避免 toggle 两次
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            }
        })
        .build(app)?;
    Ok(tray)
}
