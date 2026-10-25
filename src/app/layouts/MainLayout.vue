<script setup>
// ── 应用外壳：侧边栏导航 + 顶栏 + 通知中心 ──
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Bell,
  Collection,
  DataAnalysis,
  Document,
  House,
  Key,
  Search,
  SwitchButton,
  Tickets,
  Trophy,
  User,
  View,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.js'
import { useNotificationStore } from '@/stores/notification.js'
import { ROLE } from '@/shared/types/dict.js'
import { titleFor } from '@/app/pageTitles.js'
import { formatDateTime } from '@/shared/utils/format.js'
import GlobalSearch from '@/features/search/GlobalSearch.vue'
import PasswordDialog from '@/features/auth/PasswordDialog.vue'
import ParticleField from '@/shared/components/ParticleField.vue'
import AiCopilot from '@/shared/components/AiCopilot.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationStore()

const roleMeta = computed(() => ROLE[auth.role] || { label: '未登录', elType: 'info' })
const initials = computed(() => (auth.user?.name || '未登录').slice(0, 1))

const navSections = computed(() => {
  const workflow = [
    { name: 'Topics', label: '课题中心', icon: House },
    { name: 'Projects', label: auth.canManage ? '学生项目' : '我的项目', icon: Collection },
    { name: 'Applications', label: auth.canManage ? '申请审核' : '我的申请', icon: Document },
    { name: 'Notifications', label: '通知中心', icon: Bell },
  ]
  if (auth.canManage) {
    workflow.push({ name: 'Dashboard', label: '数据看板', icon: DataAnalysis })
  }
  if (auth.isAdvisor) {
    workflow.push({ name: 'MyBlindReviews', label: '盲审评阅', icon: View })
  }
  if (auth.isAdmin) {
    workflow.push({ name: 'AdminBlindReviews', label: '盲审抽检', icon: View })
  }
  workflow.push({ name: 'ExcellentHall', label: '优秀论文', icon: Trophy })

  const sections = [{ label: 'WORKFLOW', items: workflow }]
  if (auth.isAdmin) {
    sections.push({
      label: 'ADMIN',
      items: [
        { name: 'AdminUsers', label: '用户管理', icon: User },
        { name: 'AdminLogs', label: '审计日志', icon: Tickets },
        { name: 'AdminExcellent', label: '论文评选', icon: Trophy },
      ],
    })
  }
  return sections
})

const currentTitle = computed(() => titleFor(route.name))

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const today = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} · ${weekdays[now.getDay()]}`

function isActive(name) {
  if (name === 'Projects') return route.name === 'Projects' || route.name === 'ProjectDetail'
  return route.name === name
}

let timer = null
let glowFrame = 0
const workspaceRef = ref(null)

function handleAmbientMove(event) {
  if (glowFrame) return
  glowFrame = requestAnimationFrame(() => {
    glowFrame = 0
    const element = workspaceRef.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    element.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    element.style.setProperty('--my', `${event.clientY - rect.top}px`)
  })
}

const searchVisible = ref(false)
const passwordVisible = ref(false)

function handleShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchVisible.value = true
  }
}

onMounted(async () => {
  await notifications.load()
  timer = setInterval(() => notifications.load(), 60000)
  window.addEventListener('keydown', handleShortcut)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  cancelAnimationFrame(glowFrame)
  window.removeEventListener('keydown', handleShortcut)
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定退出当前账号吗？', '退出登录', { type: 'warning' })
  } catch {
    return
  }
  notifications.reset()
  auth.logout()
  router.replace({ name: 'Login' })
}

function handleNotificationClick(item) {
  notifications.markRead(item.id)
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">T</span>
        <div class="brand-copy">
          <strong>毕设通</strong>
          <span>THESIS OS</span>
        </div>
      </div>

      <nav class="nav">
        <template v-for="section in navSections" :key="section.label">
          <p class="nav-label">{{ section.label }}</p>
          <button
            v-for="item in section.items"
            :key="item.name"
            type="button"
            class="nav-item"
            :class="{ active: isActive(item.name) }"
            @click="router.push({ name: item.name })"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-text">{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <div class="sidebar-note">
        <div class="note-status">
          <span class="status-dot" />
          <span>SYSTEM ONLINE</span>
        </div>
        <span class="note-label">CURRENT TERM</span>
        <p class="note-title">2027 届毕业设计</p>
        <p class="note-desc">选题 · 开题 · 中期 · 答辩 · 归档</p>
      </div>

      <div class="sidebar-foot">
        <div class="user-block">
          <span class="avatar">{{ initials }}</span>
          <div class="user-meta">
            <strong>{{ auth.user?.name || '未登录' }}</strong>
            <span>{{ roleMeta.label }}</span>
          </div>
          <button type="button" class="logout" title="修改密码" @click="passwordVisible = true">
            <el-icon><Key /></el-icon>
          </button>
          <button type="button" class="logout" title="退出登录" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
          </button>
        </div>
      </div>
    </aside>

    <div ref="workspaceRef" class="workspace" @mousemove="handleAmbientMove">
      <ParticleField class="ambient-field" variant="light" :density="0.00005" :interactive="true" />
      <span class="ambient-scan" aria-hidden="true" />
      <header class="topbar">
        <div class="crumb">
          <span class="crumb-root">工作台</span>
          <span class="crumb-sep">/</span>
          <strong class="crumb-current">{{ currentTitle }}</strong>
        </div>

        <div class="topbar-right">
          <button type="button" class="search-trigger" @click="searchVisible = true">
            <el-icon><Search /></el-icon>
            <span>搜索</span>
            <kbd class="search-kbd">Ctrl K</kbd>
          </button>

          <span class="topbar-date num">{{ today }}</span>

          <el-popover placement="bottom-end" :width="360" trigger="click">
            <template #reference>
              <button type="button" class="icon-btn" aria-label="通知">
                <el-icon><Bell /></el-icon>
                <span v-if="notifications.unreadCount" class="unread-dot" />
              </button>
            </template>

            <div class="notice">
              <div class="notice-head">
                <div>
                  <p class="notice-title">通知</p>
                  <p class="notice-sub num">{{ notifications.unreadCount }} UNREAD</p>
                </div>
                <el-button
                  link
                  type="primary"
                  size="small"
                  :disabled="notifications.unreadCount === 0"
                  @click="notifications.markAllRead()"
                >
                  全部已读
                </el-button>
              </div>

              <div v-if="notifications.items.length === 0" class="notice-empty">暂无通知</div>
              <ul v-else class="notice-list">
                <li
                  v-for="item in notifications.recent"
                  :key="item.id"
                  class="notice-item"
                  :class="{ unread: !item.isRead }"
                  @click="handleNotificationClick(item)"
                >
                  <div class="notice-item-head">
                    <span class="notice-item-title">{{ item.title }}</span>
                    <span class="notice-time num">{{ formatDateTime(item.createdAt) }}</span>
                  </div>
                  <p class="notice-content">{{ item.content }}</p>
                </li>
              </ul>

              <div class="notice-foot">
                <el-button link type="primary" size="small" @click="router.push({ name: 'Notifications' })">
                  查看全部通知 →
                </el-button>
              </div>
            </div>
          </el-popover>

          <span class="role-pill">{{ roleMeta.label }}</span>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component, route: currentRoute }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="currentRoute.path" />
          </transition>
        </router-view>
      </main>

      <footer class="content-foot">
        <span class="foot-brand">THESIS OS</span>
        <span class="foot-note">毕业设计全流程管理 · v1.8.0</span>
      </footer>
    </div>

    <GlobalSearch v-model="searchVisible" />
    <PasswordDialog v-model="passwordVisible" />
    <AiCopilot />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 248px;
  display: flex;
  flex-direction: column;
  padding: 22px 16px 16px;
  background: var(--ink-900);
  color: #e8efeb;
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 22px;
  border-bottom: 1px solid rgba(232, 239, 235, 0.1);
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--jade-300);
  color: var(--jade-300);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 600;
  border-radius: 3px;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.brand-copy strong {
  font-size: 15px;
  letter-spacing: 0.08em;
}

.brand-copy span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.24em;
  color: rgba(232, 239, 235, 0.45);
}

.nav {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-label {
  margin: 0 0 8px 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.22em;
  color: rgba(232, 239, 235, 0.35);
}

.nav-label:not(:first-child) {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(232, 239, 235, 0.07);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(232, 239, 235, 0.68);
  font-family: var(--font-sans);
  font-size: 13.5px;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-item:hover {
  background: rgba(232, 239, 235, 0.06);
  color: #fff;
}

.nav-item.active {
  background: rgba(123, 211, 182, 0.12);
  color: #fff;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--jade-300);
  border-radius: 2px;
}

.nav-icon {
  font-size: 16px;
  color: inherit;
  transition: transform 0.18s ease;
}

.nav-item:hover .nav-icon {
  transform: translateX(2px);
}

.nav-text {
  flex: 1;
  text-align: left;
}

.sidebar-note {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(232, 239, 235, 0.1);
  border-radius: 4px;
  background: rgba(232, 239, 235, 0.03);
}

.note-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(232, 239, 235, 0.08);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: rgba(123, 211, 182, 0.75);
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jade-300);
  box-shadow: 0 0 0 3px rgba(123, 211, 182, 0.12);
  animation: status-pulse 2.6s ease-out infinite;
}

@keyframes status-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(123, 211, 182, 0.38);
  }

  70% {
    box-shadow: 0 0 0 7px rgba(123, 211, 182, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(123, 211, 182, 0);
  }
}

.note-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgba(232, 239, 235, 0.38);
}

.note-title {
  margin: 8px 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #e8efeb;
}

.note-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(232, 239, 235, 0.45);
}

.sidebar-foot {
  padding-top: 14px;
  border-top: 1px solid rgba(232, 239, 235, 0.1);
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(123, 211, 182, 0.16);
  color: var(--jade-300);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.user-meta strong {
  font-size: 12.5px;
  font-weight: 600;
  color: #e8efeb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: rgba(232, 239, 235, 0.42);
}

.logout {
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: rgba(232, 239, 235, 0.5);
  cursor: pointer;
  transition: all 0.18s ease;
}

.logout:hover {
  border-color: rgba(232, 239, 235, 0.16);
  color: #fff;
}

.workspace {
  position: relative;
  margin-left: 248px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace::before {
  content: '';
  position: fixed;
  left: 248px;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    560px circle at var(--mx, 62%) var(--my, 8%),
    rgba(14, 122, 99, 0.11),
    transparent 65%
  );
}

.workspace::after {
  content: '';
  position: fixed;
  left: 248px;
  right: 0;
  top: -8%;
  height: 560px;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(620px 320px at 82% 0%, rgba(123, 211, 182, 0.17), transparent 70%);
  filter: blur(10px);
  animation: workspace-aurora 16s ease-in-out infinite alternate;
}

@keyframes workspace-aurora {
  from {
    transform: translate3d(-2%, 0, 0) scale(1);
    opacity: 0.65;
  }

  to {
    transform: translate3d(4%, 26px, 0) scale(1.08);
    opacity: 1;
  }
}

.ambient-scan {
  position: fixed;
  left: 248px;
  right: 0;
  top: 60px;
  height: 1px;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(14, 122, 99, 0.38), transparent);
  box-shadow: 0 0 14px rgba(123, 211, 182, 0.45);
  opacity: 0.55;
  animation: ambient-scan 8s linear infinite;
}

@keyframes ambient-scan {
  from {
    transform: translateX(-30%);
  }

  to {
    transform: translateX(130%);
  }
}

.ambient-field {
  position: fixed;
  left: 248px;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 15;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 32px;
  background: rgba(245, 244, 239, 0.88);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}

.crumb-root {
  color: var(--text-faint);
}

.crumb-sep {
  color: var(--line);
}

.crumb-current {
  font-weight: 600;
  color: var(--text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-date {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.search-trigger:hover {
  border-color: var(--jade-600);
  color: var(--jade-700);
}

.search-kbd {
  padding: 2px 5px;
  border: 1px solid var(--line-soft);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  background: var(--surface-soft);
}

.icon-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-regular);
  cursor: pointer;
  transition: all 0.18s ease;
}

.icon-btn:hover {
  border-color: var(--ink-700);
  color: var(--ink-900);
}

.unread-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--clay-600);
  box-shadow: 0 0 0 2px var(--paper);
}

.role-pill {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  background: var(--surface);
}

.content {
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 40px;
}

.content-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 0 32px 28px;
}

.foot-brand {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.2em;
  color: var(--text-faint);
}

.foot-note {
  font-size: 11px;
  color: var(--text-faint);
}

.notice-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.notice-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.notice-sub {
  margin: 4px 0 0;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.notice-empty {
  padding: 28px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.notice-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
}

.notice-item {
  padding: 12px 8px;
  border-bottom: 1px solid var(--line-soft);
  cursor: pointer;
  transition: background 0.16s ease;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-item:hover {
  background: var(--surface-soft);
}

.notice-item.unread .notice-item-title::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--clay-600);
  margin-right: 6px;
  vertical-align: middle;
}

.notice-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notice-item-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.notice-time {
  font-size: 9.5px;
  color: var(--text-faint);
  white-space: nowrap;
}

.notice-content {
  margin: 5px 0 0;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text-regular);
}

.notice-foot {
  display: flex;
  justify-content: center;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid var(--line-soft);
}

@media (max-width: 1024px) {
  .sidebar {
    position: static;
    width: 100%;
    padding: 16px;
  }

  .brand {
    padding-bottom: 14px;
  }

  .nav {
    flex-direction: row;
    overflow-x: auto;
    margin-top: 14px;
  }

  .nav-label,
  .sidebar-note {
    display: none;
  }

  .nav-item {
    width: auto;
    white-space: nowrap;
  }

  .sidebar-foot {
    margin-top: 14px;
  }

  .workspace {
    margin-left: 0;
  }

  .workspace::before,
  .workspace::after {
    left: 0;
  }

  .ambient-scan {
    left: 0;
  }

  .ambient-field {
    left: 0;
  }

  .topbar {
    padding: 0 16px;
  }

  .content {
    padding: 20px 16px 32px;
  }

  .topbar-date {
    display: none;
  }

  .search-trigger span,
  .search-trigger .search-kbd {
    display: none;
  }

  .search-trigger {
    width: 32px;
    padding: 0;
    justify-content: center;
  }
}
</style>
