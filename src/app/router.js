// ── Vue Router 配置 ──
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { titleFor } from '@/app/pageTitles.js'
import MainLayout from '@/app/layouts/MainLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/features/auth/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/topics' },
      {
        path: 'topics',
        name: 'Topics',
        component: () => import('@/features/topic/TopicListView.vue'),
      },
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('@/features/application/ApplicationListView.vue'),
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/features/project/ProjectListView.vue'),
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/features/project/ProjectDetailView.vue'),
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/features/dashboard/DashboardView.vue'),
        meta: { roles: ['ADVISOR', 'ADMIN'] },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/features/notification/NotificationListView.vue'),
      },
      {
        path: 'blind-reviews',
        name: 'MyBlindReviews',
        component: () => import('@/features/review/MyBlindReviewView.vue'),
        meta: { roles: ['ADVISOR'] },
      },
      {
        path: 'excellent',
        name: 'ExcellentHall',
        component: () => import('@/features/review/ExcellentHallView.vue'),
      },
      {
        path: 'admin/blind-reviews',
        name: 'AdminBlindReviews',
        component: () => import('@/features/review/AdminBlindReviewView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/excellent',
        name: 'AdminExcellent',
        component: () => import('@/features/review/AdminExcellentView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('@/features/admin/UserListView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/logs',
        name: 'AdminLogs',
        component: () => import('@/features/admin/AuditLogView.vue'),
        meta: { roles: ['ADMIN'] },
      },
    ],
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/features/error/ErrorView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/features/error/ErrorView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAuth && !auth.user) {
    try {
      await auth.loadMe()
    } catch {
      auth.logout()
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
    return { path: '/topics' }
  }

  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { path: '/topics' }
  }

  return true
})

router.afterEach((to) => {
  document.title = `${titleFor(to.name)} · 毕设通`
})

router.onError((error) => {
  console.error('[router error]', error)
  router.replace({
    name: 'Error',
    query: { code: '500', message: '页面资源加载失败，请刷新后重试' },
  })
})

export default router
