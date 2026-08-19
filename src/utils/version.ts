/**
 * 解析 semver 版本为数字数组（容忍前导 v / 后缀 -alpha 等），非 semver 返回 null
 */
function parseVersion(v: string): number[] | null {
  const m = /^\s*v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?\s*$/i.exec(v || '')
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/**
 * 比较两个版本号：a > b 返回 1，a < b 返回 -1，相等返回 0。
 * 均为合法 semver 时按数字逐段比较（1.10.0 > 1.9.0）；任一非 semver 退化为字符串比较。
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (pa && pb) {
    for (let i = 0; i < 3; i++) {
      if (pa[i] > pb[i]) return 1
      if (pa[i] < pb[i]) return -1
    }
    return 0
  }
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
