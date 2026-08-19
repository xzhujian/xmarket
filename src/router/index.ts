import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import SubWindowLayout from '@/layouts/SubWindowLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: 'nav.home' } },
    { path: '/plugins', name: 'plugins', component: () => import('@/views/Plugins.vue'), meta: { title: 'nav.plugins' } },
    { path: '/messages', name: 'messages', component: () => import('@/views/Messages.vue'), meta: { title: 'nav.messages' } },
    { path: '/plugin/:id', name: 'plugin', component: () => import('@/views/PluginHost.vue'), meta: { title: '插件' } },
    { path: '/market/:id', name: 'market-detail', component: () => import('@/views/MarketDetail.vue'), meta: { title: 'market.detail_title' } },
    {
      path: '/window',
      component: SubWindowLayout,
      children: [
        { path: 'settings', name: 'window-settings', component: () => import('@/views/Settings.vue'), meta: { title: 'settings.title' } },
      ],
    },
  ],
})

// 调试页面 — 仅在开发模式下注册
if (import.meta.env.DEV) {
  router.addRoute({
    path: '/debug',
    name: 'debug',
    component: () => import('@/views/Debug.vue'),
    meta: { title: '调试面板' },
  })
  router.addRoute({
    path: '/debug/window-state',
    name: 'debug-window-state',
    component: () => import('@/views/WindowStateDebug.vue'),
    meta: { title: '窗口状态调试' },
  })
}

export default router
