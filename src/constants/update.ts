// 自升级检查地址：Gitee 主项目仓库 qyxh 里 release/version.json 的 raw 直链（不走 API，不限流）。
// version.json 在 release/ 目录、随主仓库提交。
export const UPDATE_URL = 'https://gitee.com/enterprise-and-galaxy/qyxh/raw/master/release/version.json'

// version.json 期望格式：
//   {
//     "version": "0.5.0",              // 最新版本号（必填）
//     "url": "https://gitee.com/.../企与星河.exe",  // 最新版 exe 下载地址（必填）
//     "updaterUrl": "https://gitee.com/.../updater.exe", // 更新助手下载地址（必填，单独打包、每次发版重新上传）
//     "minVersion": "0.3.0"            // 可直接升级的最低版本（可选）。
//                                      // 本地低于该值时不提供一键下载，提示手动安装。
//   }
