// ── 应用入口 ──
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-loading.css'
import router from '@/app/router.js'
import { useAuthStore } from '@/stores/auth.js'
import { onUnauthorized } from '@/shared/api/request.js'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
// v-loading 指令需要显式注册
app.use(ElLoading)

// 任意接口返回 401：清理内存中的登录态并回到登录页，避免界面“假登录”
onUnauthorized(() => {
  const auth = useAuthStore()
  const current = router.currentRoute.value
  auth.logout()
  if (current.name === 'Login') return
  router.replace({ name: 'Login', query: { redirect: current.fullPath } }).catch(() => {})
})

app.mount('#app')
