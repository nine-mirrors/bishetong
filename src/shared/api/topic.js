// ── 课题接口 ──
import { request } from './request.js'

export function fetchTopics(params) {
  return request('/topics', { params })
}

export function createTopic(payload) {
  return request('/topics', { method: 'POST', body: payload })
}

export function applyTopic(id, statement) {
  return request(`/topics/${id}/apply`, { method: 'POST', body: { statement } })
}
