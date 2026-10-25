// ── 通知接口 ──
import { request } from './request.js'

export function fetchNotifications(params) {
  return request('/notifications', { params })
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PUT' })
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PUT' })
}
