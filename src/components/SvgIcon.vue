<!-- Lucide 图标组件 — 纯本地编译，零网络请求 -->
<template>
  <component :is="iconComponent" :size="size" stroke-width="1.5" class="icon" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  name: string
  size?: number
}>(), {
  size: 22,
})

/**
 * 自定义名称 → Lucide 图标组件映射
 * Lucide 图标列表: https://lucide.dev/icons/
 */
const iconMap: Record<string, any> = {
  home: LucideIcons.Home,
  market: LucideIcons.ShoppingBag,
  messages: LucideIcons.Bell,
  theme: LucideIcons.Palette,
  settings: LucideIcons.Settings,
  layout: LucideIcons.LayoutTemplate,
  about: LucideIcons.Info,
  sun: LucideIcons.Sun,
  moon: LucideIcons.Moon,
  download: LucideIcons.Download,
  upload: LucideIcons.Upload,
  share: LucideIcons.Share,
  check: LucideIcons.Check,
  close: LucideIcons.X,
  menu: LucideIcons.Menu,
  search: LucideIcons.Search,
  plus: LucideIcons.Plus,
  bell: LucideIcons.Bell,
  dashboard: LucideIcons.LayoutDashboard,
  folder: LucideIcons.Folder,
  cpu: LucideIcons.Cpu,
  logo: LucideIcons.Box,
  package: LucideIcons.Package,
  'chevron-right': LucideIcons.ChevronRight,
  'chevron-left': LucideIcons.ChevronLeft,
  grid: LucideIcons.Grid,
  refresh: LucideIcons.RefreshCw,
  star: LucideIcons.Star,
  license: LucideIcons.ScrollText,
  wrench: LucideIcons.Wrench,
  image: LucideIcons.Image,
  'grip-vertical': LucideIcons.GripVertical,
}

const iconComponent = computed(() => iconMap[props.name] || LucideIcons.HelpCircle)
</script>

<style scoped>
.icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
