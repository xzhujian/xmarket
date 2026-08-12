use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::thread;
use tiny_http::{Header, Response, Server};

static PLUGIN_SERVER_PORT: OnceLock<u16> = OnceLock::new();

pub fn get_port() -> Option<u16> {
    PLUGIN_SERVER_PORT.get().copied()
}

/// 启动本地 HTTP 服务器，服务多个静态根目录（插件目录、皮肤目录等）。
pub fn start(roots: Vec<PathBuf>) -> u16 {
    let server = Server::http("127.0.0.1:0").expect("启动本地 HTTP 服务器失败");
    let port = server.server_addr().to_ip().unwrap().port();
    PLUGIN_SERVER_PORT.set(port).ok();

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let roots = roots.clone();
            thread::spawn(move || handle_request(request, &roots));
        }
    });

    port
}

fn handle_request(request: tiny_http::Request, roots: &[PathBuf]) {
    let url = request.url();
    let path = url.trim_start_matches('/');

    // 阻止路径穿越
    let safe_path = sanitize_path(path);

    // 依次在各根目录下查找静态文件
    for root in roots {
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
    for root in roots {
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

    // 404
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
            let response = Response::from_data(data)
                .with_header(ct_header)
                .with_header(cl_header);
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
