// ── AI 辅助接口 ──
import { request } from './request.js'

export function fetchAiStatus() {
  return request('/ai/status')
}

export function aiAssist(payload) {
  // 大模型生成可能超过默认 10 秒，单独放宽超时
  return request('/ai/assist', { method: 'POST', body: payload, timeout: 35000 })
}

export function aiChat(payload) {
  return request('/ai/chat', { method: 'POST', body: payload, timeout: 35000 })
}
