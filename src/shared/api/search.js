// ── 全局搜索接口 ──
import { request } from './request.js'

export function globalSearch(q) {
  return request('/search', { params: { q } })
}
