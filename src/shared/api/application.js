// ── 课题申请接口 ──
import { request } from './request.js'

export function fetchApplications(params) {
  return request('/applications', { params })
}

export function reviewApplication(id, payload) {
  return request(`/applications/${id}/review`, { method: 'PUT', body: payload })
}
