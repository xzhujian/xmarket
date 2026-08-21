// 生成 release/version.json + 把 updater.exe/主程序 exe 拷进 release/ —— 每次发版跑 build:updater 时自动执行。
// 版本号从 package.json 自动读。
// 布局(单仓库方案,全部用主项目仓库 qyxh):
//  - release/version.json 随主仓库 qyxh 一起提交、push,程序经 raw 直链读取(小文件,免登录)。
//  - release/ 里的两个 exe 被 gitignore 排除(不进 git),由你手动上传成 qyxh 的【发行版附件】,
//    下载走 releases/download 直链(免登录)。Gitee raw 对大文件要登录,所以 exe 不能走 raw。
// 注意:REPO 需与 src/constants/update.ts 里的 UPDATE_URL(版本检查地址)保持一致。

const REPO = {
  owner: 'enterprise-and-galaxy',
  repo: 'qyxh', // 主项目仓库(源码 + version.json + 发行版附件全在这)
  branch: 'master', // 版本检查(version.json raw 直链)用的分支
  tagPrefix: '', // Release tag 前缀,例: v0.1.2;当前用 0.1.2(不带 v),与 Gitee 上建的 tag 保持一致
  exeName: '企与星河.exe', // 主程序 exe 文件名(下载 URL 里要用,须与 Release 附件一致)
}

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const tag = `${REPO.tagPrefix}${version}`
const releaseBase = `https://gitee.com/${REPO.owner}/${REPO.repo}/releases/download/${tag}`
const versionJson = {
  version,
  url: `${releaseBase}/${encodeURIComponent(REPO.exeName)}`,
  updaterUrl: `${releaseBase}/updater.exe`,
}

const outDir = join(root, 'release')
mkdirSync(outDir, { recursive: true })

// 1. 写 version.json 到 release/(随主仓库提交,push 后经 raw 读取)
writeFileSync(join(outDir, 'version.json'), JSON.stringify(versionJson, null, 2) + '\n')
console.log(`✔ 生成 release/version.json (v${version})`)

// 2. 拷 updater.exe 到 release/(作为发行版附件手动上传)
const updaterExe = join(root, 'updater', 'target', 'release', 'updater.exe')
if (existsSync(updaterExe)) {
  copyFileSync(updaterExe, join(outDir, 'updater.exe'))
  console.log('✔ 拷贝 updater.exe → release/')
} else {
  console.warn('⚠ 未找到 updater/target/release/updater.exe,请先编译 updater')
}

// 3. 拷主程序 exe 到 release/(作为发行版附件手动上传)
const appExe = join(root, 'src-tauri', 'target', 'release', REPO.exeName)
if (existsSync(appExe)) {
  copyFileSync(appExe, join(outDir, REPO.exeName))
  console.log(`✔ 拷贝 ${REPO.exeName} → release/`)
} else {
  console.warn(`⚠ 未找到 src-tauri/target/release/${REPO.exeName},请先 tauri build 生成主程序`)
}