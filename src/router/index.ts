import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: 'nav.home' } },
    { path: '/market', name: 'market', component: () => import('@/views/Market.vue'), meta: { title: 'nav.market' } },
    { path: '/my-apps', name: 'my-apps', component: () => import('@/views/MyApps.vue'), meta: { title: 'nav.my_apps' } },
    { path: '/messages', name: 'messages', component: () => import('@/views/Messages.vue'), meta: { title: 'nav.messages' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: 'nav.settings' } },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue'), meta: { title: 'nav.about' } },
    { path: '/plugin/:id', name: 'plugin', component: () => import('@/views/PluginHost.vue'), meta: { title: '插件' } },
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
}

export default router
