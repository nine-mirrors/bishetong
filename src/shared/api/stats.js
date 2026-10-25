// ── 统计看板接口 ──
import { request } from './request.js'

export function fetchOverview() {
  return request('/stats/overview')
}
