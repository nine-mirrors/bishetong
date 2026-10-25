// ── 用户管理接口 ──
import { request } from './request.js'

export function fetchUsers(params) {
  return request('/users', { params })
}

export function createUser(payload) {
  return request('/users', { method: 'POST', body: payload })
}

export function updateUserStatus(id, isActive) {
  return request(`/users/${id}/status`, { method: 'PATCH', body: { isActive } })
}

export function resetUserPassword(id, password) {
  return request(`/users/${id}/password`, { method: 'PATCH', body: { password } })
}
