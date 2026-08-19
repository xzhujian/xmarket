// 化妆打包：读取 src-tauri/brands.json 中 active 指定的品牌，临时写进 tauri.conf.json 与 Cargo.toml →
// tauri build → 还原稳定默认。命令固定：pnpm build:brand（无参数）。
//
// brands.json 规范：
//   {
//     "active": "客户A",                 // 想打哪个特殊包就改这一个字段
//     "brands": {
//       "客户A": {
//         "productName": "客户A",           // 打包名称（安装包/exe/程序内默认名，也会作为主程序 exe 名）
//         "icon": ["icons/a.ico"]           // 图标，路径相对 src-tauri/
//       },
//       "客户B": { "productName": "客户B", "icon": ["icons/b.ico"] }
//     }
//   }
// 正常 `pnpm tauri build` / `pnpm tauri dev` 不触发任何品牌改动，始终用稳定默认（企与星河）。
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const srcTauri = resolve(scriptDir, '..')
const configPath = join(srcTauri, 'brands.json')
const confPath = join(srcTauri, 'tauri.conf.json')
const confBackupPath = join(srcTauri, 'tauri.conf.brand-backup.json')
const cargoPath = join(srcTauri, 'Cargo.toml')
const cargoBackupPath = join(srcTauri, 'Cargo.toml.brand-backup')

if (!existsSync(configPath)) {
  console.error(`[brand-build] 未找到品牌配置文件: ${configPath}`)
  process.exit(1)
}
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const active = config.active
const brand = config.brands?.[active]
if (!active || !brand) {
  console.error(`[brand-build] brands.json 中未找到 active="${active}" 对应的品牌配置`)
  process.exit(1)
}
if (!brand.productName) {
  console.error(`[brand-build] 品牌「${active}」缺少 productName`)
  process.exit(1)
}
if (Array.isArray(brand.icon) && brand.icon.length) {
  const missing = brand.icon.filter((p) => !existsSync(join(srcTauri, p)))
  if (missing.length) {
    console.error(`[brand-build] 品牌「${active}」图标缺失: ${missing.join(', ')}`)
    process.exit(1)
  }
}

// 无论打包成功/失败/中断，都要把 tauri.conf.json 与 Cargo.toml 还原成稳定默认（幂等）
function restore() {
  if (existsSync(confBackupPath)) {
    copyFileSync(confBackupPath, confPath)
    rmSync(confBackupPath, { force: true })
    console.log('[brand-build] 已还原 tauri.conf.json 为稳定默认')
  }
  if (existsSync(cargoBackupPath)) {
    copyFileSync(cargoBackupPath, cargoPath)
    rmSync(cargoBackupPath, { force: true })
    console.log('[brand-build] 已还原 Cargo.toml 为稳定默认')
  }
}
process.on('exit', restore)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130))

const conf = JSON.parse(readFileSync(confPath, 'utf8'))
copyFileSync(confPath, confBackupPath)

conf.productName = brand.productName
if (conf.app?.windows?.length) conf.app.windows[0].title = brand.productName
if (Array.isArray(brand.icon) && brand.icon.length) conf.bundle.icon = brand.icon
writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n', 'utf8')

// 切换主程序 exe 名：把 Cargo.toml 的 [[bin]] name 改成品牌名，产出 <品牌名>.exe
copyFileSync(cargoPath, cargoBackupPath)
let cargo = readFileSync(cargoPath, 'utf8')
if (!/\[\[bin\]\]/.test(cargo)) {
  console.error('[brand-build] Cargo.toml 缺少 [[bin]] 段，无法切换 exe 名（稳定默认需先加 [[bin]] name="企与星河"）')
  process.exit(1)
}
cargo = cargo.replace(
  /(\[\[bin\]\][\s\S]*?name\s*=\s*")[^"]+(")/,
  `$1${brand.productName}$2`
)
writeFileSync(cargoPath, cargo, 'utf8')

console.log(`[brand-build] 已应用品牌「${active}」(名称=${brand.productName}，exe=${brand.productName}.exe)，开始打包...`)
try {
  execSync('pnpm tauri build', { stdio: 'inherit', cwd: resolve(scriptDir, '../..') })
} finally {
  restore()
}
