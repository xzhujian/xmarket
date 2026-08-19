<template>
  <div class="subwindow-layout flex flex-col h-screen" :style="{ background: 'transparent' }">
    <!-- 自定义标题栏 -->
    <div
      class="title-bar flex items-center justify-between select-none"
      :style="{
        background: appStore.isDark ? 'rgba(27,27,27,0.62)' : 'rgba(245,245,245,0.62)',
        borderBottom: '1px solid var(--line-color)',
        height: '36px',
        paddingLeft: '12px',
        paddingRight: '0',
      }"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2" data-tauri-drag-region>
        <BrandLogo :size="16" />
        <span class="text-sm font-medium" :style="{ color: 'var(--text-color)' }">{{ $t(titleKey) }}</span>
      </div>

      <!-- 窗口控制按钮 -->
      <div class="flex h-full items-center" data-tauri-drag-region="false">
        <button
          class="win-btn flex items-center justify-center"
          :style="{ width: '46px', height: '100%', background: 'transparent', color: 'var(--text-color)' }"
          @click="closeWin"
          @mouseenter="($event.currentTarget as HTMLElement).style.background = '#e81123'; ($event.currentTarget as HTMLElement).style.color = '#fff'"
          @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'; ($event.currentTarget as HTMLElement).style.color = 'var(--text-color)'"
          :title="$t('common.close')"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-hidden">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { watch, onMounted } from 'vue'
import { inTauri } from '@/services/ipc'
import BrandLogo from '@/components/BrandLogo.vue'

const route = useRoute()
const appStore = useAppStore()

// 子窗口以隐藏方式创建,内容挂载后再显示,避免白屏加载一闪
onMounted(async () => {
  if (!inTauri()) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const win = getCurrentWebviewWindow()
  // Windows 下带 parent 的子窗口会继承父窗口的最大化状态，显示前先还原，避免"最大化→缩小"闪一帧
  await win.unmaximize().catch(() => {})
  await win.show().catch(() => {})
  await win.setFocus().catch(() => {})
})

const { locale } = useI18n()
watch(() => appStore.locale, (val) => { locale.value = val }, { immediate: true })

const titleKey = route.meta.title as string || ''

// 关闭即销毁:下次打开重新创建,才能每次触发系统原生弹出效果
async function closeWin() {
  if (!inTauri()) return
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  await getCurrentWebviewWindow().close()
}
</script>

<style scoped>
.win-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: none;
}

.win-btn:active {
  transform: none;
}
</style>
