//! updater.exe —— 自升级的执行器,用简单 GUI 窗口替代命令行(正式版形态)。
//!
//! 主程序下载本程序后拉起它,由它完成全部升级动作:
//!   1. 读 version.json → 拿新 exe 地址 → 下载新 exe(此时主程序还活着,只转圈);
//!   2. 终止主程序进程(taskkill,不带 /T —— 否则会把 updater 自己一起杀掉);
//!   3. 等待旧 exe 解锁 → 用新 exe 覆盖 → 清理 → 重启。
//!
//! GUI 是一个小窗口,中间显示当前步骤文字与下载百分比,结束后自动关闭。
//! 状态文件(framework-update-status.json)供主程序轮询感知失败,用于失败恢复。

#![windows_subsystem = "windows"]

use std::env;
use std::ffi::OsString;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use winapi::ctypes::c_void;
use winapi::shared::minwindef::{HINSTANCE, LPARAM, LRESULT, UINT, WPARAM, TRUE};
use winapi::shared::windef::{HBRUSH, HDC, HMENU, HWND, RECT};
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::wingdi::{GetStockObject, SelectObject, SetBkMode, DEFAULT_GUI_FONT, TRANSPARENT};
use winapi::um::winuser::{
    BeginPaint, CreateWindowExW, DefWindowProcW, DispatchMessageW, DrawTextW, EndPaint,
    GetClientRect, GetMessageW, GetSystemMetrics, InvalidateRect, LoadCursorW, PostMessageW,
    PostQuitMessage, RegisterClassW, ShowWindow, TranslateMessage, UpdateWindow, COLOR_WINDOW,
    DT_CENTER, DT_SINGLELINE, DT_VCENTER, IDC_ARROW, MSG, PAINTSTRUCT, SM_CXSCREEN, SM_CYSCREEN,
    SW_SHOW, WM_APP, WM_CLOSE, WM_DESTROY, WM_PAINT, WNDCLASSW, WS_CAPTION, WS_OVERLAPPED,
};

const MAX_RETRIES: u32 = 120; // 120 * 500ms ≈ 60s
const RETRY_INTERVAL: Duration = Duration::from_millis(500);

const STATUS_MSG: UINT = WM_APP + 1; // 工作线程 → 主线程:刷新状态文字

static STATUS: Mutex<String> = Mutex::new(String::new());
static mut HWND_MAIN: HWND = std::ptr::null_mut();

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// 更新界面状态文字并通知窗口重绘
fn set_status(text: &str) {
    *STATUS.lock().unwrap() = text.to_string();
    unsafe {
        if !HWND_MAIN.is_null() {
            PostMessageW(HWND_MAIN, STATUS_MSG, 0, 0);
        }
    }
}

/// 状态文件路径(与主程序后端 get_update_status 读同一文件,用于失败恢复)
fn status_path() -> PathBuf {
    env::temp_dir().join("framework-update-status.json")
}

fn write_status(phase: &str) {
    let _ = fs::write(status_path(), format!("{{\"phase\":\"{}\"}}", phase));
}

/// 出错:写 error 状态文件 + 窗口显示错误;停留几秒后自动关闭(窗口没有关闭按钮)
fn set_error(message: &str) {
    let safe = message.replace('"', "'").replace('\\', "/");
    let _ = fs::write(status_path(), format!("{{\"phase\":\"error\",\"message\":\"{}\"}}", safe));
    set_status(&format!("更新失败: {}", message));
    schedule_close(6);
}

/// 延迟若干秒后向主窗口发 WM_CLOSE,实现更新完成后自动关闭
fn schedule_close(secs: u64) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(secs));
        unsafe {
            PostMessageW(HWND_MAIN, WM_CLOSE, 0, 0);
        }
    });
}

fn download(url: &str) -> Result<Vec<u8>, String> {
    let resp = ureq::get(url)
        .call()
        .map_err(|e| format!("下载失败: {}", e))?;
    let mut bytes = Vec::new();
    resp.into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| format!("读取响应失败: {}", e))?;
    if bytes.is_empty() {
        return Err("下载内容为空".to_string());
    }
    Ok(bytes)
}

/// 下载新 exe,并按已读字节回调进度(百分比),用于更新界面文字
fn download_with_progress(url: &str, on_progress: &mut dyn FnMut(u32)) -> Result<Vec<u8>, String> {
    let resp = ureq::get(url)
        .call()
        .map_err(|e| format!("下载失败: {}", e))?;
    let total: u64 = resp
        .header("Content-Length")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let mut reader = resp.into_reader();
    let mut chunk = vec![0u8; 64 * 1024];
    let mut bytes = Vec::new();
    let mut read: u64 = 0;
    loop {
        let n = reader
            .read(&mut chunk)
            .map_err(|e| format!("读取响应失败: {}", e))?;
        if n == 0 {
            break;
        }
        bytes.extend_from_slice(&chunk[..n]);
        read += n as u64;
        if total > 0 {
            on_progress(((read as f64 / total as f64) * 100.0) as u32);
        }
    }
    if bytes.is_empty() {
        return Err("下载内容为空".to_string());
    }
    Ok(bytes)
}

// —— 窗口过程 ——
unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: UINT, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    match msg {
        STATUS_MSG => {
            InvalidateRect(hwnd, std::ptr::null(), TRUE);
            0
        }
        WM_PAINT => {
            let mut ps: PAINTSTRUCT = std::mem::zeroed();
            let hdc: HDC = BeginPaint(hwnd, &mut ps);
            let text = STATUS.lock().unwrap().clone();
            let wide = to_wide(&text);
            let old_font = SelectObject(hdc, GetStockObject(DEFAULT_GUI_FONT as i32));
            SetBkMode(hdc, TRANSPARENT as i32);
            let mut rect: RECT = std::mem::zeroed();
            GetClientRect(hwnd, &mut rect);
            DrawTextW(
                hdc,
                wide.as_ptr(),
                (wide.len() - 1) as i32,
                &mut rect,
                DT_CENTER | DT_VCENTER | DT_SINGLELINE,
            );
            SelectObject(hdc, old_font);
            EndPaint(hwnd, &ps);
            0
        }
        WM_DESTROY => {
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

// —— 升级主体:在工作线程里跑,主线程负责消息循环 ——
fn run_update(args: Vec<OsString>) {
    if args.len() < 4 {
        set_error("参数不足");
        return;
    }
    let old_exe = PathBuf::from(&args[1]);
    let pid = args[2].to_string_lossy().into_owned();
    let version_url = args[3].to_string_lossy().into_owned();
    let bak = format!("{}.bak", old_exe.display());

    // 1. 读 version.json,取新 exe 地址
    write_status("downloading");
    set_status("正在读取版本信息...");
    let version_bytes = match download(&version_url) {
        Ok(b) => b,
        Err(e) => {
            set_error(&format!("读取版本信息失败: {}", e));
            return;
        }
    };
    let info: serde_json::Value = match serde_json::from_slice(&version_bytes) {
        Ok(v) => v,
        Err(e) => {
            set_error(&format!("解析版本信息失败: {}", e));
            return;
        }
    };
    let new_exe_url = match info.get("url").and_then(|u| u.as_str()) {
        Some(u) => u.to_string(),
        None => {
            set_error("版本信息缺少 url 字段");
            return;
        }
    };

    // 2. 下载新 exe(主程序此刻还活着、只转圈),实时显示百分比
    set_status("正在下载新版本 0%");
    let new_exe = env::temp_dir().join("framework-new-version.exe");
    let mut last_pct: u32 = 0;
    let new_bytes = match download_with_progress(&new_exe_url, &mut |pct| {
        if pct != last_pct {
            last_pct = pct;
            set_status(&format!("正在下载新版本 {}%", pct));
        }
    }) {
        Ok(b) => b,
        Err(e) => {
            set_error(&e);
            return;
        }
    };
    set_status("正在下载新版本 100%");
    if let Err(e) = fs::write(&new_exe, &new_bytes) {
        set_error(&format!("写入新版本失败: {}", e));
        return;
    }
    write_status("ready");

    // 3. 终止主程序(/F 强杀,不带 /T —— /T 会把 updater 自己一起杀掉)
    set_status("正在终止旧程序...");
    let _ = Command::new("taskkill").args(["/PID", &pid, "/F"]).status();

    // 4. 等待旧 exe 解锁:能成功改名即代表主进程已退出、文件未被占用
    set_status("正在替换文件...");
    let mut ok = false;
    for _ in 0..MAX_RETRIES {
        if fs::rename(&old_exe, &bak).is_ok() {
            ok = true;
            break;
        }
        thread::sleep(RETRY_INTERVAL);
    }
    if !ok {
        set_error("等待旧程序退出超时,更新未完成");
        return;
    }

    // 5. 用新 exe 覆盖旧 exe
    if let Err(e) = fs::copy(&new_exe, &old_exe) {
        set_error(&format!("替换文件失败: {}", e));
        let _ = fs::rename(&bak, &old_exe);
        return;
    }

    // 6. 清理 .bak 与临时新 exe,重启主程序,然后自动关闭窗口
    let _ = fs::remove_file(&bak);
    let _ = fs::remove_file(&new_exe);
    set_status("更新完成,程序即将重启...");
    let _ = Command::new(&old_exe).spawn();
    schedule_close(2);
}

fn main() {
    let hinstance: HINSTANCE = unsafe { GetModuleHandleW(std::ptr::null()) };
    let class_name = to_wide("FrameworkUpdaterWnd");

    let wc = WNDCLASSW {
        style: 0,
        lpfnWndProc: Some(wnd_proc),
        cbClsExtra: 0,
        cbWndExtra: 0,
        hInstance: hinstance,
        hIcon: std::ptr::null_mut(),
        hCursor: unsafe { LoadCursorW(std::ptr::null_mut(), IDC_ARROW) },
        hbrBackground: (COLOR_WINDOW + 1) as HBRUSH,
        lpszMenuName: std::ptr::null(),
        lpszClassName: class_name.as_ptr(),
    };
    unsafe {
        RegisterClassW(&wc);
    }

    // 窗口居中
    let w = 380i32;
    let h = 140i32;
    let x = (unsafe { GetSystemMetrics(SM_CXSCREEN) } - w) / 2;
    let y = (unsafe { GetSystemMetrics(SM_CYSCREEN) } - h) / 3;

    let title = to_wide("企与星河 更新");
    let hwnd: HWND = unsafe {
        CreateWindowExW(
            0,
            class_name.as_ptr(),
            title.as_ptr(),
            WS_OVERLAPPED | WS_CAPTION,
            x,
            y,
            w,
            h,
            std::ptr::null_mut(),
            std::ptr::null_mut() as HMENU,
            hinstance,
            std::ptr::null_mut() as *mut c_void,
        )
    };
    unsafe {
        HWND_MAIN = hwnd;
        ShowWindow(hwnd, SW_SHOW);
        UpdateWindow(hwnd);
    }
    set_status("正在启动...");

    // 工作线程跑升级,主线程跑消息循环
    let args: Vec<OsString> = env::args_os().collect();
    thread::spawn(move || run_update(args));

    let mut msg: MSG = unsafe { std::mem::zeroed() };
    loop {
        let r = unsafe { GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) };
        if r == 0 || r == -1 {
            break;
        }
        unsafe {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}
