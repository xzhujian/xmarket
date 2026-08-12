// 窗口状态边界检测 —— 纯逻辑测试(无需 Tauri,node scripts/window-state-test.mjs 直接跑)
// 判定规则:窗口矩形必须【完整】落在某个显示器内才原样恢复;
// 任一部分超出所有屏幕(稍微有一块在屏外)→ 主屏居中(初始化状态)+ 尺寸钳制到主屏。
// 函数实现与 src/services/windowState.ts 保持一致,改动时需同步。

function isFullyOnAnyMonitor(rect, monitors) {
  return monitors.some((m) => {
    return (
      rect.x >= m.position.x &&
      rect.y >= m.position.y &&
      rect.x + rect.width <= m.position.x + m.size.width &&
      rect.y + rect.height <= m.position.y + m.size.height
    )
  })
}

function computeRestoreBounds(saved, monitors, primary) {
  if (isFullyOnAnyMonitor(saved, monitors)) {
    return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
  }
  if (!primary) return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
  const px = primary.position.x, py = primary.position.y, pw = primary.size.width, ph = primary.size.height
  const width = Math.min(saved.width, pw)
  const height = Math.min(saved.height, ph)
  return { x: px + Math.round((pw - width) / 2), y: py + Math.round((ph - height) / 2), width, height }
}

// ---- 测试框架 ----
let pass = 0, fail = 0
function assert(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      期望 ${e}\n      实际 ${a}`) }
}

// 主屏 (0,0,1920,1080)
const primary1920 = { position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 } }
// 左副屏 (0,0) + 主屏 (1920,0)
const monitorsDual = [
  { position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 } },
  { position: { x: 1920, y: 0 }, size: { width: 1920, height: 1080 } },
]
const primaryRight = { position: { x: 1920, y: 0 }, size: { width: 1920, height: 1080 } }

console.log('边界检测测试(完整在屏内判定)\n')

console.log('— 单屏(0,0,1920,1080),窗口 800x600 —')
const mono = [primary1920]
assert('完整在屏内 → 原样恢复', computeRestoreBounds({ x: 100, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 100, y: 100, width: 800, height: 600 })
assert('右出屏(右缘 2500>1920)→ 主屏居中', computeRestoreBounds({ x: 1700, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('左出屏(x=-1000)→ 主屏居中', computeRestoreBounds({ x: -1000, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('上出屏(y=-1000)→ 主屏居中', computeRestoreBounds({ x: 100, y: -1000, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('下出屏(y=2000)→ 主屏居中', computeRestoreBounds({ x: 100, y: 2000, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })

console.log('— 稍微露出一块在屏外 → 触发初始化(居中) —')
assert('左露 200(窗口 -600..200)→ 居中', computeRestoreBounds({ x: -600, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('左缘只露 1px(x=-1,窗口 -1..799)→ 居中', computeRestoreBounds({ x: -1, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('右缘只露 1px(x=1121,窗口 1121..1921)→ 居中', computeRestoreBounds({ x: 1121, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })
assert('底部只露 1px(y=481,窗口 481..1081)→ 居中', computeRestoreBounds({ x: 100, y: 481, width: 800, height: 600 }, mono, primary1920), { x: 560, y: 240, width: 800, height: 600 })

console.log('— 紧贴边缘、完整在屏内 → 原样恢复 —')
assert('窗口紧贴左缘(0..800)→ 原样恢复', computeRestoreBounds({ x: 0, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 0, y: 100, width: 800, height: 600 })
assert('窗口紧贴右缘(1120..1920)→ 原样恢复', computeRestoreBounds({ x: 1120, y: 100, width: 800, height: 600 }, mono, primary1920), { x: 1120, y: 100, width: 800, height: 600 })
assert('窗口铺满整屏(0,0,1920,1080)→ 原样恢复', computeRestoreBounds({ x: 0, y: 0, width: 1920, height: 1080 }, mono, primary1920), { x: 0, y: 0, width: 1920, height: 1080 })

console.log('— 双屏:左副屏(0,0) + 主屏(1920,0) —')
assert('窗口完整在左副屏内 → 原样恢复', computeRestoreBounds({ x: 100, y: 100, width: 800, height: 600 }, monitorsDual, primaryRight), { x: 100, y: 100, width: 800, height: 600 })
assert('窗口完整在主屏内 → 原样恢复', computeRestoreBounds({ x: 2500, y: 100, width: 800, height: 600 }, monitorsDual, primaryRight), { x: 2500, y: 100, width: 800, height: 600 })
// 跨屏:1400..2200,单块屏都放不下完整窗口 → 视为在屏外 → 主屏居中
assert('跨两屏(1400..2200)→ 主屏居中', computeRestoreBounds({ x: 1400, y: 100, width: 800, height: 600 }, monitorsDual, primaryRight), { x: 1920 + 560, y: 240, width: 800, height: 600 })

console.log('— 左副屏被拔掉,只剩主屏(1920,0,1920,1080),保存的还在左屏坐标 —')
const monitorsOnlyRight = [primaryRight]
assert('原左屏位置(窗口 100..900)→ 主屏居中', computeRestoreBounds({ x: 100, y: 100, width: 800, height: 600 }, monitorsOnlyRight, primaryRight), { x: 1920 + 560, y: 240, width: 800, height: 600 })

console.log('— 窗口比主屏大且出屏 → 钳制到主屏再居中 —')
assert('大窗口出屏 → 尺寸钳制+居中', computeRestoreBounds({ x: 5000, y: 5000, width: 3000, height: 2000 }, mono, primary1920), { x: 0, y: 0, width: 1920, height: 1080 })

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail > 0) process.exit(1)
