// 右键默认菜单限制：屏蔽 WebView2 默认右键菜单，且不影响应用/插件自己写的右键菜单。
// 统一用 bubble 阶段 + defaultPrevented 判断：若已有自定义菜单 preventDefault 了，
// 说明它接管了，我们就不干预；否则才 preventDefault（屏蔽默认菜单）。
//
// 注：插件 webview 的自定义右键菜单脚本（刷新/回退/前进）由 Rust 侧
// WebviewBuilder::initialization_script 注入，单份维护在 plugin_server.rs。

/** 主窗口：屏蔽 WebView2 默认右键菜单，不影响应用自身自定义菜单。 */
export function installMainContextMenuGuard() {
  window.addEventListener('contextmenu', (e) => {
    if (e.defaultPrevented) return
    e.preventDefault()
  })
}
