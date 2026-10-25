<script setup>
// ── 通知中心 ──
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/shared/api/notification.js'
import { useNotificationStore } from '@/stores/notification.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import { formatDateTime } from '@/shared/utils/format.js'

const store = useNotificationStore()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const unreadCount = ref(0)
const query = reactive({ status: '', page: 1, pageSize: 10 })

async function loadNotifications() {
  loading.value = true
  try {
    const result = await fetchNotifications(query)
    rows.value = result.list
    total.value = result.total
    unreadCount.value = result.unreadCount
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

function switchStatus(status) {
  if (query.status === status) return
  query.status = status
  query.page = 1
  loadNotifications()
}

async function markOne(item) {
  if (item.isRead) return
  try {
    await markNotificationRead(item.id)
    item.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    store.load()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function markAll() {
  if (unreadCount.value === 0) return
  try {
    await markAllNotificationsRead()
    ElMessage.success('已全部标记为已读')
    store.load()
    loadNotifications()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function handlePageChange(page) {
  query.page = page
  loadNotifications()
}

onMounted(loadNotifications)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">INBOX</p>
        <h1 class="page-title">通知中心</h1>
        <p class="page-sub">课题申请、里程碑批阅与催办提醒都会汇总在这里。</p>
      </div>
      <div class="page-head-actions">
        <el-button :disabled="unreadCount === 0" @click="markAll">全部已读</el-button>
      </div>
    </header>

    <div class="toolbar">
      <div class="seg">
        <button type="button" class="seg-item" :class="{ active: query.status === '' }" @click="switchStatus('')">
          全部
          <span class="seg-count num">{{ total }}</span>
        </button>
        <button
          type="button"
          class="seg-item"
          :class="{ active: query.status === 'UNREAD' }"
          @click="switchStatus('UNREAD')"
        >
          未读
          <span class="seg-count num">{{ unreadCount }}</span>
        </button>
      </div>
      <div class="toolbar-spacer" />
      <span class="toolbar-meta num">{{ total }} MESSAGES</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">消息列表</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">系统自动生成，无需回复</span>
      </div>

      <div v-loading="loading" class="notice-box">
        <div v-if="rows.length === 0" class="empty">
          <EmptyState title="暂无通知" description="新的申请、批阅与催办提醒会出现在这里。" />
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="notice-row"
          :class="{ unread: !item.isRead }"
          @click="markOne(item)"
        >
          <span class="state-dot" />
          <div class="notice-main">
            <div class="notice-head">
              <span class="notice-title">{{ item.title }}</span>
              <span class="notice-time num">{{ formatDateTime(item.createdAt) }}</span>
            </div>
            <p class="notice-content">{{ item.content }}</p>
          </div>
          <span class="notice-action">{{ item.isRead ? '已读' : '标记已读' }}</span>
        </article>
      </div>

      <div class="panel-foot">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.toolbar-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.seg {
  display: flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-soft);
}

.seg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 3px;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.seg-item.active {
  background: var(--ink-900);
  color: #fff;
}

.seg-count {
  font-size: 10px;
  opacity: 0.7;
}

.panel-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-count {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.panel-note {
  font-size: 10.5px;
  color: var(--text-faint);
}

.notice-box {
  min-height: 120px;
}

.empty {
  padding: 48px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.notice-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  cursor: pointer;
  transition: background 0.16s ease;
}

.notice-row:last-child {
  border-bottom: none;
}

.notice-row:hover {
  background: var(--surface-soft);
}

.state-dot {
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--line);
  flex-shrink: 0;
}

.notice-row.unread .state-dot {
  background: var(--clay-600);
  box-shadow: 0 0 0 3px rgba(180, 71, 31, 0.12);
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.notice-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.notice-time {
  font-size: 10px;
  color: var(--text-faint);
  white-space: nowrap;
}

.notice-content {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-regular);
}

.notice-action {
  font-size: 10.5px;
  color: var(--text-faint);
  white-space: nowrap;
}

.notice-row.unread .notice-action {
  color: var(--jade-600);
}

.panel-foot {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--line-soft);
}
</style>
