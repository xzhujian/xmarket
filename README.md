# 企与星河

一个 Windows 桌面端**插件宿主框架**应用(基于 **Tauri 2 + Vue 3 + TypeScript**)。它本身不提供固定功能,而是作为"容器"承载第三方插件:支持插件(应用)的安装与管理、应用市场、消息、设置与自升级。Windows 平台,NSIS 安装包。

## 项目定位与核心设计

理解这个项目,先抓住几条贯穿始终的设计决策:

- **它是宿主,不是功能集合**。用户安装的是一个个插件(独立应用页面),宿主负责加载、运行、隔离、管理它们。插件是标准 HTML/Web 页面,以子 webview 运行,每插件独立 `plugins/<id>/` 目录。
- **数据放安装文件夹,整个文件夹可分享**。config、DB、皮肤、插件、插件数据都放在 `resource_dir`(安装/项目目录),**不迁 appdata**。这使"把安装文件夹拷给别人即可用"成为可能(分发方式是分享文件夹,不是分发安装包)。
- **自升级只换主程序 exe**。前端内嵌在 exe 里;升级只替换 exe,插件/数据/配置全部保留。
- **配置是单向模型**。后端 `config` 文件是唯一事实来源,前端 `state` 只是投影,写入统一走 `commitConfig → 后端 → 广播 → applyConfig`,保证各窗口一致。
- **权限指 Tauri capability 授权**(某个 webview 能调用哪些命令的白名单),不是文件系统权限。

## 架构概览

```
前端 (Vue 3 + Pinia)
 ├─ 各页面:Home / Plugins / Market / Messages / Settings
 ├─ stores:app(配置投影) · plugin(插件列表) · runtime(插件窗口运行态) · pluginsUI
 └─ 经 invoke/event 与后端通信

后端 (Rust + Tauri 2)
 ├─ lib.rs            命令中心:mod 声明 + invoke_handler 总清单
 ├─ settings.rs       配置 / 窗口状态 / 皮肤 / 图标
 ├─ system.rs         托盘 + 关闭拦截
 ├─ plugin_manager.rs 插件生命周期(扫描/安装/卸载/启停/排序)
 ├─ plugin_server.rs  本地 HTTP 服务器(.localhost 虚拟主机,隔离 localStorage)
 ├─ plugin_runtime.rs 插件子 webview 创建/退出
 ├─ plugin_permission.rs 插件权限网关(plugin_invoke,占位)
 └─ updater.rs        自升级(下载 updater.exe 并拉起)

插件系统
 ├─ plugins/<id>/     插件源码(只读,可重打包分享)
 ├─ plugins-data/<id>/ 插件数据(可写,卸载可选保留/删除)
 ├─ db/framework.db   SQLite(plugin_states 持久化:启禁/排序/来源市场)
 └─ manifest.json     静态声明(入口/keepAlive/权限等)
```

三份 capability 文件(`capabilities/{default,settings,plugins}.json`)按 webview 区分权限:主窗口全量、设置窗口设置相关、插件子 webview 仅插件相关命令。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 · TypeScript · Pinia · vue-router · vue-i18n · UnoCSS · Vite |
| 后端 | Rust · Tauri 2 · sqlx(SQLite) · tiny_http |
| 打包 | NSIS(Windows 安装包) |

## 目录结构

```
framework-app/
├── src/                  # 前端
│   ├── views/            # 页面(Home / Plugins / Market / Messages / Settings ...)
│   ├── components/       # 组件
│   ├── stores/           # Pinia 状态(app / plugin / runtime / pluginsUI)
│   ├── services/         # 数据服务(config / skin / windowState ...)
│   ├── constants/        # 常量(如 update.ts 的检查地址)
│   ├── locales/          # i18n(zh-CN / en-US)
│   ├── router/           # 路由
│   ├── layouts/          # 布局
│   └── utils/            # 工具
├── src-tauri/            # Tauri / Rust 后端
│   ├── src/              # 后端命令(Rust 模块)
│   ├── capabilities/     # 权限(capability 文件)
│   └── tauri.conf.json   # 应用配置(版本/打包/权限/窗口)
├── updater/              # 独立的更新助手 crate(单独打包,负责换 exe)
├── release/              # 发版工作区(version.json + 待上传的 exe)
└── scripts/              # 构建脚本(gen-version.mjs 等)
```

## 开发

```bash
pnpm install        # 安装依赖
pnpm tauri:dev      # 启动开发(热更新)
```

## 构建

```bash
pnpm tauri:build    # 完整打包(NSIS 安装包 + 主程序 exe)
pnpm build:updater  # 编译 updater + 生成 release/version.json + 拷贝 exe 到 release/
```

主程序产物:`src-tauri/target/release/企与星河.exe`
安装包:`src-tauri/target/release/bundle/nsis/企与星河_<version>_x64-setup.exe`

## 在线自升级

程序在 **设置 → 关于 → 检查更新**(手动触发)中从 Gitee 主仓库 `qyxh` 拉取 `release/version.json`,对比本地版本;若存在新版本,则下载 `updater.exe` 与新版主程序 exe,由 updater 终止主程序、替换 exe 并重启。

### 更新清单(version.json)

程序经以下 raw 直链读取(小文件,免登录):

```
https://gitee.com/enterprise-and-galaxy/qyxh/raw/master/release/version.json
```

格式(由 `scripts/gen-version.mjs` 自动生成):

```json
{
  "version": "0.1.2",
  "url": "https://gitee.com/enterprise-and-galaxy/qyxh/releases/download/v0.1.2/企与星河.exe",
  "updaterUrl": "https://gitee.com/enterprise-and-galaxy/qyxh/releases/download/v0.1.2/updater.exe"
}
```

> 说明:Gitee raw 对大文件(>约 2MB)要求登录,所以 **exe 不走 raw**,而是作为 **发行版附件**(`releases/download` 直链,免登录)分发;`version.json` 很小,随主仓库提交、走 raw。二者分工不同,缺一不可。

### 发版流程

1. 升级版本号:`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.lock`(一致改成新版本)
2. `pnpm tauri:build` — 打包主程序
3. `pnpm build:updater` — 编译 updater,自动生成 `release/version.json`(指向 v<新版本>),并拷贝两个 exe 到 `release/`
4. `git commit` + `git push` 将 `release/version.json` 提交到主仓库 `qyxh`
5. 在 Gitee `qyxh` 仓库创建 **v<新版本>** 发行版,上传 `release/` 下的两个附件:
   - `企与星河.exe`
   - `updater.exe`

> 若忘记上传附件,用户端更新时会因下载 404 而失败(不会静默下错版本),补传后即可恢复。

## 关键约定

- **配置单向模型**:后端 `config` 是唯一事实来源,前端 `state` 只是投影;写入统一走 `commitConfig → 后端 → 广播 → applyConfig`。
- **应用市场**:市场由「市场地址」列表驱动,每个地址对应一个市场 tab。
- **插件隔离**:插件按目录隔离,本地 HTTP 服务按 `.localhost` 子域名做虚拟主机,实现插件 localStorage 隔离与持久化。
- **自升级**:只替换主程序 exe(前端内嵌在 exe 内),插件与数据不动;数据迁移由新程序启动时执行。
