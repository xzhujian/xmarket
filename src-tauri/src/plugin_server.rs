use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::thread;
use tauri::{AppHandle, Manager};
use tiny_http::{Header, Response, Server};

static PLUGIN_SERVER_PORT: OnceLock<u16> = OnceLock::new();

/// 注入插件 webview 的右键菜单脚本（经 WebviewBuilder::initialization_script 注入，
/// 文档创建时先于插件自身 JS 执行，天然幂等、无定时器）。全单引号，避免与 raw string 冲突。
const PLUGIN_CONTEXT_MENU_SCRIPT: &str = r#"(() => {
  if (window.__zbCtx) return
  window.__zbCtx = true

  function copySelection() {
    const sel = window.getSelection()
    if (!sel || !sel.toString()) return
    try { document.execCommand('copy') } catch (err) {}
  }

  function init() {
    const style = document.createElement('style')
    style.textContent = '.zb-ctx{position:fixed;z-index:2147483647;min-width:130px;padding:4px;border-radius:8px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);font:13px/1.6 system-ui,sans-serif;user-select:none}.zb-ctx button{display:block;width:100%;padding:6px 12px;border:0;background:none;border-radius:5px;color:#222;text-align:left;cursor:pointer;font:inherit;white-space:nowrap}.zb-ctx button:hover{background:#eef2f7}.zb-ctx button:disabled{color:#a8a8a8;cursor:default}.zb-ctx button:disabled:hover{background:none}.zb-ctx .sep{height:1px;margin:4px 0;background:#eee}'
    document.head.appendChild(style)

    let menu = null

    function close() { if (menu) { menu.remove(); menu = null } }

    function addBtn(label, disabled, onClick) {
      const btn = document.createElement('button')
      btn.textContent = label
      if (disabled) btn.disabled = true
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); close(); onClick() })
      menu.appendChild(btn)
    }

    function addSep() {
      const hr = document.createElement('div')
      hr.className = 'sep'
      menu.appendChild(hr)
    }

    function open(x, y) {
      close()
      menu = document.createElement('div')
      menu.className = 'zb-ctx'
      addBtn('刷新', false, () => location.reload())
      addBtn('后退', false, () => history.back())
      addBtn('前进', false, () => history.forward())
      addSep()
      addBtn('复制', false, copySelection)
      document.body.appendChild(menu)
      const r = menu.getBoundingClientRect()
      menu.style.left = Math.max(0, Math.min(x, innerWidth - r.width - 4)) + 'px'
      menu.style.top = Math.max(0, Math.min(y, innerHeight - r.height - 4)) + 'px'
    }

    document.addEventListener('contextmenu', (e) => {
      if (e.defaultPrevented) return
      e.preventDefault()
      open(e.clientX, e.clientY)
    }, false)

    document.addEventListener('click', close, true)
    document.addEventListener('scroll', close, true)
    window.addEventListener('blur', close)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() }, true)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()"#;

pub fn get_port() -> Option<u16> {
    PLUGIN_SERVER_PORT.get().copied()
}

/// 启动本地 HTTP 服务器（nginx 式按 Host 虚拟主机）：
///  - `http://<插件id>.localhost:<端口>/...` → plugins/<插件id>/... （每插件独立 origin）
///  - `http://127.0.0.1:<端口>/...`           → 共享根目录（如 skins/）
///
/// 端口持久化到 resource_dir/plugin-server.port，重启优先复用，保证
/// origin（域名 + 端口）稳定 → 插件 localStorage 跨重启不丢。
pub fn start(resource_dir: PathBuf) -> u16 {
    let plugins_dir = resource_dir.join("plugins");
    let skins_dir = resource_dir.join("skins");
    let port_file = resource_dir.join("plugin-server.port");

    let server = bind_server(&port_file);
    let port = server.server_addr().to_ip().unwrap().port();
    PLUGIN_SERVER_PORT.set(port).ok();
    let _ = fs::write(&port_file, port.to_string());

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let plugins_dir = plugins_dir.clone();
            let skins_dir = skins_dir.clone();
            thread::spawn(move || handle_request(request, &plugins_dir, &skins_dir));
        }
    });

    port
}

/// 优先复用上次持久化的端口；被占用或不存在则随机绑定
fn bind_server(port_file: &Path) -> Server {
    if let Ok(prev) = fs::read_to_string(port_file) {
        if let Ok(p) = prev.trim().parse::<u16>() {
            if let Ok(server) = Server::http(format!("127.0.0.1:{p}")) {
                return server;
            }
        }
    }
    Server::http("127.0.0.1:0").expect("启动本地 HTTP 服务器失败")
}

fn handle_request(request: tiny_http::Request, plugins_dir: &Path, skins_dir: &Path) {
    let url = request.url();
    let path = url.trim_start_matches('/');
    let safe_path = sanitize_path(path);

    // 按 Host 判断是否插件子域名（<插件id>.localhost），决定从哪个根目录服务
    let roots: Vec<PathBuf> = if let Some(plugin_id) = plugin_id_from_host(&request) {
        find_plugin_dir(plugins_dir, &plugin_id)
            .map(|dir| vec![dir])
            .unwrap_or_default()
    } else {
        vec![skins_dir.to_path_buf()]
    };

    if roots.is_empty() {
        respond_404(request);
        return;
    }

    // 依次在各根目录下查找静态文件
    for root in &roots {
        let full_path = root.join(&safe_path);
        // 规范化路径，防止 ../ 绕过
        if let Ok(canonical) = full_path.canonicalize() {
            if canonical.starts_with(root) && canonical.is_file() {
                serve_file(request, &canonical);
                return;
            }
        }
    }

    // SPA fallback: 从请求路径的目录向上找 index.html
    for root in &roots {
        let full_path = root.join(&safe_path);
        if let Some(canonical_dir) = full_path.parent().and_then(|p| p.canonicalize().ok()) {
            if canonical_dir.starts_with(root) {
                let mut dir = canonical_dir.clone();
                loop {
                    let index_html = dir.join("index.html");
                    if index_html.is_file() {
                        serve_file_with_content_type(request, &index_html, "text/html; charset=utf-8");
                        return;
                    }
                    if !dir.pop() || dir == *root || !dir.starts_with(root) {
                        break;
                    }
                }
            }
        }
    }

    respond_404(request);
}

/// 从请求 Host 头解析插件 id（host 形如 `插件id.localhost:端口`）。
/// 返回 None 表示非插件子域名（走 127.0.0.1 共享根目录）。
fn plugin_id_from_host(request: &tiny_http::Request) -> Option<String> {
    let host = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Host"))
        .map(|h| h.value.as_str().to_string())?;
    let lower = host.to_ascii_lowercase();
    let idx = lower.find(".localhost")?;
    let id = lower[..idx].trim_end_matches(':').to_string();
    if id.is_empty() || id == "127.0.0.1" || id == "localhost" {
        None
    } else {
        Some(id)
    }
}

/// 在 plugins/ 下按插件 id 定位目录（hostname 已小写，目录名做大小写不敏感匹配）
fn find_plugin_dir(plugins_dir: &Path, id: &str) -> Option<PathBuf> {
    let id_lower = id.to_lowercase();
    fs::read_dir(plugins_dir)
        .ok()?
        .flatten()
        .find(|e| {
            e.file_name().to_string_lossy().to_lowercase() == id_lower && e.path().is_dir()
        })
        .map(|e| e.path())
}

fn respond_404(request: tiny_http::Request) {
    let response = Response::from_string("404 Not Found").with_status_code(404);
    let _ = request.respond(response);
}

fn serve_file(request: tiny_http::Request, path: &Path) {
    let mime = mime_type(path);
    serve_file_with_content_type(request, path, mime);
}

fn serve_file_with_content_type(request: tiny_http::Request, path: &Path, mime: &str) {
    match fs::read(path) {
        Ok(data) => {
            let len = data.len();
            let ct_header = Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap();
            let cl_header =
                Header::from_bytes(&b"Content-Length"[..], len.to_string().as_bytes()).unwrap();
            let cors_header =
                Header::from_bytes(&b"Access-Control-Allow-Origin"[..], b"*").unwrap();
            let response = Response::from_data(data)
                .with_header(ct_header)
                .with_header(cl_header)
                .with_header(cors_header);
            let _ = request.respond(response);
        }
        Err(_) => {
            let response = Response::from_string("404 Not Found").with_status_code(404);
            let _ = request.respond(response);
        }
    }
}

fn sanitize_path(path: &str) -> String {
    path.replace('\\', "/")
        .split('/')
        .filter(|seg| !seg.is_empty() && *seg != "..")
        .collect::<Vec<_>>()
        .join("/")
}

fn mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" | "svgz" => "image/svg+xml",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "json" => "application/json; charset=utf-8",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "eot" => "application/vnd.ms-fontobject",
        "wasm" => "application/wasm",
        "map" => "application/json",
        _ => "application/octet-stream",
    }
}

// ─── 服务器命令 ───────────────────────────────────────────────

/// 获取插件 HTTP 服务器的端口号
#[tauri::command]
pub fn get_plugin_server_port() -> Result<u16, String> {
    get_port().ok_or_else(|| "插件服务器未启动".to_string())
}

/// 将插件入口 HTML 路径转为虚拟主机 URL（http://<插件id>.localhost:<端口>/...）
#[tauri::command]
pub fn get_plugin_server_url(app: AppHandle, entry_html: String) -> Result<String, String> {
    let port = get_port().ok_or_else(|| "插件服务器未启动".to_string())?;
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("获取资源目录失败: {}", e))?;
    let plugins_dir = resource_dir.join("plugins");
    let entry_path = PathBuf::from(&entry_html);
    let relative = entry_path
        .strip_prefix(&plugins_dir)
        .map_err(|_| format!("插件路径不在插件目录下: {}", entry_html))?;

    // 首段为插件 id；虚拟主机 URL 以插件 id 作子域名，路径去掉该段前缀
    let mut comps = relative.components();
    let plugin_id = comps
        .next()
        .and_then(|c| c.as_os_str().to_str())
        .ok_or_else(|| "无法解析插件 id".to_string())?;
    let inner = relative
        .strip_prefix(&format!("{plugin_id}/"))
        .unwrap_or(relative)
        .to_string_lossy()
        .replace('\\', "/");

    Ok(format!("http://{plugin_id}.localhost:{port}/{inner}"))
}

/// 创建插件内嵌子 webview，并注入自定义右键菜单初始化脚本。
/// 初始化脚本在文档创建时先于插件自身 JS 执行，天然幂等、无定时器，
/// 避免在运行时 eval 导致遮罩层卡住吞掉主窗口点击。
/// Windows 上 webview 创建必须在 async 命令中，否则同步命令会死锁（见 WebviewBuilder 注释）。
#[tauri::command]
pub async fn create_plugin_webview(
    app: AppHandle,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{LogicalPosition, LogicalSize, WebviewUrl};
    let main = app
        .get_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    let wv_url = if let Ok(u) = url.parse::<tauri::Url>() {
        WebviewUrl::External(u)
    } else {
        WebviewUrl::App(url.into())
    };
    main.add_child(
        tauri::webview::WebviewBuilder::new(label, wv_url)
            .initialization_script(PLUGIN_CONTEXT_MENU_SCRIPT)
            // wry 默认装 drag-drop handler 会拦截前端 HTML5 拖拽，需禁用才能用 draggable/拖放
            .disable_drag_drop_handler(),
        LogicalPosition::new(x, y),
        LogicalSize::new(width, height),
    )
    .map(|_| ())
    .map_err(|e| format!("创建插件 webview 失败: {e}"))
}
