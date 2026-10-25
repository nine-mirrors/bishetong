// ── 盲审抽检接口 ──
import { downloadFile, request } from './request.js'

export function sampleBlindReviews(count) {
  return request('/blind-reviews/sample', { method: 'POST', body: { count } })
}

export function fetchBlindReviews(params) {
  return request('/blind-reviews', { params })
}

export function fetchMyBlindReviews() {
  return request('/blind-reviews/my')
}

export function submitBlindReview(id, payload) {
  return request(`/blind-reviews/${id}/submit`, { method: 'POST', body: payload })
}

export function downloadBlindReviewDocument(reviewId, documentId, filename) {
  return downloadFile(
    `/blind-reviews/${reviewId}/documents/${documentId}/download`,
    filename,
    '下载盲审材料失败',
  )
}

export function deleteBlindReview(id) {
  return request(`/blind-reviews/${id}`, { method: 'DELETE' })
}

export function fetchBlindStats() {
  return request('/blind-reviews/stats')
}
