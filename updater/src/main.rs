//! updater.exe —— 自升级的执行器(单独打包,发版时从 Gitee 单独下载,不打进安装包)。
//!
//! 主程序下载本程序后拉起它,由它完成全部升级动作:
//!   1. 读 version.json → 拿新 exe 地址 → 下载新 exe(此时主程序还活着,只转圈);
//!   2. 终止主程序进程(taskkill);
//!   3. 等待旧 exe 解锁(能改名即说明已释放)→ 用新 exe 覆盖 → 清理 → 重启。
//!
//! 任何下载失败都在「终止主程序」之前发生:此时退出码非 0、且不杀主程序,
//! 主程序通过状态文件检测到 error 后可继续运行、让用户重试。
//!
//! 用法:updater.exe <旧exe路径> <主程序PID> <version.json地址>

use std::env;
use std::fs;
use std::io::Read;
use std::process::Command;
use std::thread;
use std::time::Duration;

const MAX_RETRIES: u32 = 120; // 120 * 500ms ≈ 60s
const RETRY_INTERVAL: Duration = Duration::from_millis(500);

/// 状态文件路径(与主程序后端 get_update_status 读同一文件,用于失败恢复)
fn status_path() -> std::path::PathBuf {
    env::temp_dir().join("framework-update-status.json")
}

fn write_status(phase: &str) {
    let _ = fs::write(status_path(), format!("{{\"phase\":\"{}\"}}", phase));
}

/// 写 error 状态并退出非 0(不终止主程序,主程序可据此弹错、继续运行)
fn fail(message: &str) -> ! {
    eprintln!("{}", message);
    let safe = message.replace('"', "'").replace('\\', "/");
    let _ = fs::write(status_path(), format!("{{\"phase\":\"error\",\"message\":\"{}\"}}", safe));
    std::process::exit(1);
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

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 4 {
        eprintln!("用法: updater.exe <旧exe> <主程序PID> <version.json地址>");
        std::process::exit(1);
    }
    let old_exe = &args[1];
    let pid = &args[2];
    let version_url = &args[3];
    let bak = format!("{}.bak", old_exe);

    // 1. 读 version.json,取新 exe 地址
    write_status("downloading");
    let version_bytes = download(version_url).unwrap_or_else(|e| fail(&format!("读 version.json {}", e)));
    let info: serde_json::Value =
        serde_json::from_slice(&version_bytes).unwrap_or_else(|e| fail(&format!("解析 version.json 失败: {}", e)));
    let new_exe_url = match info.get("url").and_then(|u| u.as_str()) {
        Some(u) => u.to_string(),
        None => fail("version.json 缺少 url 字段"),
    };

    // 2. 下载新 exe(主程序此刻还活着、只转圈)
    let new_exe = env::temp_dir().join("framework-new-version.exe");
    let new_bytes = download(&new_exe_url).unwrap_or_else(|e| fail(&e));
    if let Err(e) = fs::write(&new_exe, &new_bytes) {
        fail(&format!("写入新版本失败: {}", e));
    }
    write_status("ready");

    // 3. 终止主程序(/F 强杀,/T 连子进程)
    let _ = Command::new("taskkill").args(["/PID", pid, "/F", "/T"]).status();

    // 4. 等待旧 exe 解锁:能成功改名即代表主进程已退出、文件未被占用
    let mut ok = false;
    for _ in 0..MAX_RETRIES {
        if fs::rename(old_exe, &bak).is_ok() {
            ok = true;
            break;
        }
        thread::sleep(RETRY_INTERVAL);
    }
    if !ok {
        eprintln!("等待旧程序退出超时(60s),放弃更新");
        std::process::exit(2);
    }

    // 5. 用新 exe 覆盖旧 exe
    if let Err(e) = fs::copy(&new_exe, old_exe) {
        eprintln!("覆盖失败({}),回滚到旧版本", e);
        let _ = fs::rename(&bak, old_exe);
        std::process::exit(3);
    }

    // 6. 清理 .bak 与临时新 exe,重启主程序
    let _ = fs::remove_file(&bak);
    let _ = fs::remove_file(&new_exe);
    let _ = Command::new(old_exe).spawn();
}
