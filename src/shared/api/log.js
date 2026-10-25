// ── 审计日志接口 ──
import { request } from './request.js'

export function fetchLogs(params) {
  return request('/logs', { params })
}
