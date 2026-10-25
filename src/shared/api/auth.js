// ── 认证接口 ──
import { request } from './request.js'

export function loginApi({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password }, auth: false })
}

export function registerApi(payload) {
  return request('/auth/register', { method: 'POST', body: payload, auth: false })
}

export function fetchMeApi() {
  return request('/auth/me')
}

export function changePasswordApi(payload) {
  return request('/auth/password', { method: 'PUT', body: payload })
}
