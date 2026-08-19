<template>
  <div class="donut-chart">
    <svg viewBox="0 0 160 160" class="donut-svg" role="img">
      <g transform="rotate(-90 80 80)">
        <circle
          v-for="(seg, i) in segments"
          :key="i"
          cx="80"
          cy="80"
          r="64"
          fill="none"
          :stroke="seg.color"
          stroke-width="20"
          :stroke-dasharray="`${segLen(seg)} ${C}`"
          :stroke-dashoffset="-offset(i)"
        />
      </g>
      <text x="80" y="77" text-anchor="middle" class="center-val">{{ centerText }}</text>
      <text x="80" y="98" text-anchor="middle" class="center-sub">{{ centerSub }}</text>
    </svg>
    <div class="legend">
      <div v-for="seg in segments" :key="seg.name" class="legend-item">
        <span class="dot" :style="{ background: seg.color }" />
        <span class="l-name">{{ seg.name }}</span>
        <span class="l-val">{{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface DonutSegment {
  value: number
  name: string
  color: string
}

const props = defineProps<{
  segments: DonutSegment[]
  centerText: string
  centerSub: string
}>()

const C = 2 * Math.PI * 64 // 圆环周长

const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0))
const segLen = (seg: DonutSegment) => (total.value ? (seg.value / total.value) * C : 0)
const offset = (i: number) => props.segments.slice(0, i).reduce((s, x) => s + segLen(x), 0)
</script>

<style scoped>
.donut-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.donut-svg {
  width: 150px;
  height: 150px;
}
.center-val {
  font-size: 22px;
  font-weight: 700;
  fill: var(--text-color);
}
.center-sub {
  font-size: 11px;
  fill: var(--disabled-color);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--disabled-color);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.l-val {
  color: var(--text-color);
  font-weight: 600;
}
</style>
