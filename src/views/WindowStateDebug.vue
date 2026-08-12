<template>
  <div class="wsd" style="padding: 20px; font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto">
    <h2>窗口状态边界检测调试</h2>
    <p v-if="!inTauri" style="color: #c00">当前不在 Tauri 环境,无法读取原生窗口/显示器数据。</p>

    <template v-else>
      <button @click="load">重新读取</button>

      <h3>显示器列表</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse">
        <thead>
          <tr><th>#</th><th>主屏?</th><th>position (物理px)</th><th>size (物理px)</th></tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in monitors" :key="i">
            <td>{{ i }}</td>
            <td>{{ isPrimary(m) ? '✓' : '' }}</td>
            <td>{{ m.position.x }}, {{ m.position.y }}</td>
            <td>{{ m.size.width }} x {{ m.size.height }}</td>
          </tr>
        </tbody>
      </table>

      <h3>当前窗口</h3>
      <p>
        outerPosition: {{ win?.outer.x }}, {{ win?.outer.y }} &nbsp;|&nbsp;
        outerSize: {{ win?.outer.width }} x {{ win?.outer.height }} &nbsp;|&nbsp;
        isMaximized: {{ win?.maximized }}
      </p>

      <h3>边界检测(填入"保存的矩形")</h3>
      <label> x <input v-model.number="saved.x" type="number" /></label>
      <label> y <input v-model.number="saved.y" type="number" /></label>
      <label> width <input v-model.number="saved.width" type="number" /></label>
      <label> height <input v-model.number="saved.height" type="number" /></label>
      <button @click="run">运行边界检测</button>

      <div v-if="result">
        <h3>判定结果</h3>
        <p>可见性: <b :style="{ color: result.visible ? '#080' : '#c00' }">{{ result.visible ? '完整在屏内 → 原样恢复' : '有部分出屏 → 主屏居中(初始化)' }}</b></p>
        <p>最终应用 bounds: x={{ result.target.x }}, y={{ result.target.y }}, w={{ result.target.width }}, h={{ result.target.height }}</p>
        <table v-if="result.perMonitor.length" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse">
          <thead><tr><th>屏#</th><th>窗口完整在屏内?</th></tr></thead>
          <tbody>
            <tr v-for="(p, i) in result.perMonitor" :key="i">
              <td>{{ p.index }}</td>
              <td>{{ p.inside ? '✓' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inTauri } from '@/services/ipc'
import { availableMonitors, primaryMonitor, getCurrentWindow } from '@tauri-apps/api/window'
import { isFullyOnAnyMonitor, computeRestoreBounds, type MonitorLike } from '@/services/windowState'

const monitors = ref<MonitorLike[]>([])
const primary = ref<MonitorLike | null>(null)
const win = ref<{ outer: { x: number; y: number; width: number; height: number }; maximized: boolean } | null>(null)
const saved = ref({ x: 100, y: 100, width: 800, height: 600 })
const result = ref<{ visible: boolean; target: { x: number; y: number; width: number; height: number }; perMonitor: Array<{ index: number; inside: boolean }> } | null>(null)

function isPrimary(m: MonitorLike) {
  const p = primary.value
  return !!p && p.position.x === m.position.x && p.position.y === m.position.y && p.size.width === m.size.width && p.size.height === m.size.height
}

async function load() {
  if (!inTauri()) return
  const ms = await availableMonitors()
  monitors.value = ms
  primary.value = (await primaryMonitor()) ?? null
  const w = getCurrentWindow()
  const pos = await w.outerPosition()
  const size = await w.outerSize()
  const maximized = await w.isMaximized()
  win.value = { outer: { x: pos.x, y: pos.y, width: size.width, height: size.height }, maximized }
  saved.value = { x: pos.x, y: pos.y, width: size.width, height: size.height }
}

function run() {
  const rect = { x: saved.value.x, y: saved.value.y, width: saved.value.width, height: saved.value.height }
  const perMonitor = monitors.value.map((m, index) => {
    const inside =
      rect.x >= m.position.x &&
      rect.y >= m.position.y &&
      rect.x + rect.width <= m.position.x + m.size.width &&
      rect.y + rect.height <= m.position.y + m.size.height
    return { index, inside }
  })
  const visible = isFullyOnAnyMonitor(rect, monitors.value)
  const target = computeRestoreBounds(rect, monitors.value, primary.value)
  result.value = { visible, target, perMonitor }
}

onMounted(load)
</script>
