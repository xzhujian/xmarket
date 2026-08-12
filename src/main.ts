import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import router from './router'
import App from './App.vue'
import 'virtual:uno.css'
import './styles/global.scss'
import './styles/theme/teal.scss'
import './styles/theme/blue.scss'
import './styles/theme/purple.scss'
import './styles/theme/orange.scss'
import './styles/theme/rose.scss'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// 子窗口（如设置）需要等路由初始导航完成，保证首帧就是目标路由（如 /window/settings），
// 避免先闪出主界面（route.path 短暂为占位 '/'）；主窗口在 '/' 下无此问题，直接挂载更流畅
if (window.location.pathname.startsWith('/window')) {
  await router.isReady()
}

// 注册全局调试工具 $debug
// 所有页面通过 inject / getCurrentInstance 或直接 import useDebugStore 调用
// 生产模式自动降级为空函数，无性能开销
if (import.meta.env.DEV) {
  const { useDebugStore } = await import('@/stores/debug')
  const debugStore = useDebugStore()
  app.config.globalProperties.$debug = debugStore
  debugStore.info('调试工具已加载')
}

app.mount('#app')
