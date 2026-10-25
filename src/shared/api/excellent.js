// ── 优秀论文接口 ──
import { request } from './request.js'

export function fetchExcellentCandidates() {
  return request('/excellent/candidates')
}

export function fetchAwards() {
  return request('/excellent/awards')
}

export function awardExcellent(payload) {
  return request('/excellent/awards', { method: 'POST', body: payload })
}

export function revokeAward(projectId) {
  return request(`/excellent/awards/${projectId}`, { method: 'DELETE' })
}
