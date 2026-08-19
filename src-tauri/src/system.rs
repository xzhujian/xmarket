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

/// 操作所有窗口（含各窗口下挂的 plugin-page- 子 Webview）的显隐，不再写死具体窗口。
/// 子 Webview 是独立原生窗口，父窗口显隐不会自动跟随，需手动一起显隐；
/// 否则托盘隐藏应用后插件页会残留浮在桌面上，导致托盘开关"失效"。
pub fn set_all_windows_visible(app: &tauri::AppHandle, visible: bool) {
    for w in app.windows().values() {
        if visible {
            let _ = w.show();
            // 最小化的窗口 show() 不会自动还原，需 unminimize 才能回到正常窗口
            if w.is_minimized().unwrap_or(false) {
                let _ = w.unminimize();
            }
        } else {
            let _ = w.hide();
        }
        for wv in w.webviews() {
            if wv.label().starts_with("plugin-page-") {
                if visible {
                    let _ = wv.show();
                } else {
                    let _ = wv.hide();
                }
            }
        }
    }
    if visible {
        if let Some(main) = app.get_window("main") {
            let _ = main.set_focus();
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
        .tooltip(app.package_info().name.to_string())
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "tray-show" => set_all_windows_visible(app, true),
                "tray-quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            // Windows 一次左键会派发 Down+Up 两个 Click，只处理 Up 避免 toggle 两次
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                // 任一窗口可见且未最小化 → 视为打开态，点击则隐藏；否则显示并还原所有窗口
                let is_open = app.windows().values().any(|w| {
                    w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false)
                });
                set_all_windows_visible(app, !is_open);
            }
        })
        .build(app)?;
    Ok(tray)
}
