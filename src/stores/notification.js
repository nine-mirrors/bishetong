// ── 通知状态 ──
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/shared/api/notification.js'

export const useNotificationStore = defineStore('notification', () => {
  const items = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)

  const recent = computed(() => items.value.slice(0, 5))

  async function load() {
    loading.value = true
    try {
      const result = await fetchNotifications({ page: 1, pageSize: 20 })
      items.value = result.list
      unreadCount.value = result.unreadCount
    } catch {
      // 通知为辅助信息，失败时静默，不打断主流程
    } finally {
      loading.value = false
    }
  }

  async function markRead(id) {
    const target = items.value.find((item) => item.id === id)
    if (!target || target.isRead) return
    try {
      await markNotificationRead(id)
    } catch {
      return
    }
    target.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead() {
    if (unreadCount.value === 0) return
    try {
      await markAllNotificationsRead()
    } catch {
      return
    }
    items.value.forEach((item) => {
      item.isRead = true
    })
    unreadCount.value = 0
  }

  function reset() {
    items.value = []
    unreadCount.value = 0
  }

  return { items, recent, unreadCount, loading, load, markRead, markAllRead, reset }
})
