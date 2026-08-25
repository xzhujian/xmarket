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
//!
//! 测试期说明:本程序保持为命令行窗口(暂不加 windows_subsystem),每一步打印日志,
//! 并在退出前停留等回车,方便观察更新到哪一步失败。正式版再去掉停留。

use std::env;
use std::fs;
use std::io::{self, Read, Write};
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::Duration;

const MAX_RETRIES: u32 = 120; // 120 * 500ms ≈ 60s
const RETRY_INTERVAL: Duration = Duration::from_millis(500);

/// 状态文件路径(与主程序后端 get_update_status 读同一文件,用于失败恢复)
fn status_path() -> PathBuf {
    env::temp_dir().join("framework-update-status.json")
}

fn log(msg: &str) {
    println!("[updater] {}", msg);
    let _ = io::stdout().flush();
}

/// 退出前停留,让测试者能看到日志(正式版会去掉)。读不到输入时多停几秒兜底。
fn pause() {
    println!();
    println!("[updater] ---- 更新流程结束,按回车键退出 ----");
    let mut s = String::new();
    if io::stdin().read_line(&mut s).is_err() {
        thread::sleep(Duration::from_secs(3));
    }
}

fn write_status(phase: &str) {
    let _ = fs::write(status_path(), format!("{{\"phase\":\"{}\"}}", phase));
}

/// 写 error 状态并退出非 0(不终止主程序,主程序可据此弹错、继续运行)
fn fail(message: &str) -> ! {
    eprintln!("[updater][错误] {}", message);
    let safe = message.replace('"', "'").replace('\\', "/");
    let _ = fs::write(status_path(), format!("{{\"phase\":\"error\",\"message\":\"{}\"}}", safe));
    pause();
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
    // 用 args_os 取参数,避免中文路径(企与星河.exe)在 args() 下被转码损坏
    let args: Vec<_> = env::args_os().collect();
    if args.len() < 4 {
        eprintln!("用法: updater.exe <旧exe> <主程序PID> <version.json地址>");
        pause();
        std::process::exit(1);
    }
    let old_exe = PathBuf::from(&args[1]);
    let pid = args[2].to_string_lossy().into_owned();
    let version_url = args[3].to_string_lossy().into_owned();
    let bak = format!("{}.bak", old_exe.display());

    log(&format!("启动更新: 旧exe={}", old_exe.display()));
    log(&format!("主程序PID={}, version.json={}", pid, version_url));

    // 1. 读 version.json,取新 exe 地址
    write_status("downloading");
    log("正在读取 version.json...");
    let version_bytes =
        download(&version_url).unwrap_or_else(|e| fail(&format!("读 version.json {}", e)));
    let info: serde_json::Value = serde_json::from_slice(&version_bytes)
        .unwrap_or_else(|e| fail(&format!("解析 version.json 失败: {}", e)));
    let new_exe_url = match info.get("url").and_then(|u| u.as_str()) {
        Some(u) => u.to_string(),
        None => fail("version.json 缺少 url 字段"),
    };
    log(&format!("发现新版本,下载地址: {}", new_exe_url));

    // 2. 下载新 exe(主程序此刻还活着、只转圈)
    let new_exe = env::temp_dir().join("framework-new-version.exe");
    log("正在下载新版本 exe(可能较大,请稍候)...");
    let new_bytes = download(&new_exe_url).unwrap_or_else(|e| fail(&e));
    if let Err(e) = fs::write(&new_exe, &new_bytes) {
        fail(&format!("写入新版本失败: {}", e));
    }
    log(&format!("新版本下载完成,共 {} 字节", new_bytes.len()));
    write_status("ready");

    // 3. 终止主程序(/F 强杀,/T 连子进程)
    log(&format!("正在终止主程序(PID={})...", pid));
    let _ = Command::new("taskkill").args(["/PID", &pid, "/F", "/T"]).status();

    // 4. 等待旧 exe 解锁:能成功改名即代表主进程已退出、文件未被占用
    log("等待旧程序退出释放文件...");
    let mut ok = false;
    for i in 1..=MAX_RETRIES {
        if fs::rename(&old_exe, &bak).is_ok() {
            ok = true;
            log("旧 exe 已解锁,可以替换");
            break;
        }
        if i % 20 == 0 {
            log(&format!("  仍在等待(已等 {}s)...", i / 2));
        }
        thread::sleep(RETRY_INTERVAL);
    }
    if !ok {
        eprintln!("等待旧程序退出超时(60s),放弃更新");
        pause();
        std::process::exit(2);
    }

    // 5. 用新 exe 覆盖旧 exe
    log("正在用新版本覆盖旧 exe...");
    if let Err(e) = fs::copy(&new_exe, &old_exe) {
        eprintln!("覆盖失败({}),回滚到旧版本", e);
        let _ = fs::rename(&bak, &old_exe);
        pause();
        std::process::exit(3);
    }

    // 6. 清理 .bak 与临时新 exe,重启主程序
    let _ = fs::remove_file(&bak);
    let _ = fs::remove_file(&new_exe);
    log("更新完成,正在重启程序...");
    let _ = Command::new(&old_exe).spawn();
    pause();
}
