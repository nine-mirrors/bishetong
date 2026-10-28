// ── API 请求封装 ──
// 职责：统一 baseURL、JSON 序列化、JWT 注入、超时与错误提示
// 规范依据：CLAUDE.md §5.1 #8 — 请求状态统一处理

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'bishe_token'
const TIMEOUT = 10000

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 401 统一处理：由应用入口注册，负责重置登录态并跳转登录页。
// request.js 不直接依赖 store / router，避免循环引用。
let unauthorizedHandler = null

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

function handleUnauthorized() {
  clearToken()
  if (unauthorizedHandler) unauthorizedHandler()
}

/**
 * 发起请求
 * @param {string} url — 以 / 开头的接口路径
 * @param {Object} options
 * @param {string} [options.method]
 * @param {Object} [options.body]
 * @param {Object} [options.params] — query 参数，空值自动忽略
 * @param {boolean} [options.auth] — 是否携带 token，默认 true
 * @returns {Promise<any>}
 */
export async function request(url, options = {}) {
  const { method = 'GET', body, params, auth = true, timeout = TIMEOUT } = options

  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const queryString = query.toString()
  const target = `${BASE_URL}${url}${queryString ? `?${queryString}` : ''}`

  const headers = { Accept: 'application/json' }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let response
  try {
    response = await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    const message =
      error.name === 'AbortError' ? '请求超时，请稍后重试' : '网络异常，请确认后端服务已启动'
    throw new HttpError(0, message)
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized()
    throw new HttpError(response.status, data?.message || `请求失败（${response.status}）`)
  }
  return data
}

/**
 * 以附件形式下载受保护的文件（携带 JWT，经 Blob 落地）
 * @param {string} url — 以 / 开头的接口路径
 * @param {string} filename
 * @param {string} [errorMessage]
 */
export async function downloadFile(url, filename, errorMessage = '下载失败') {
  const token = getToken()
  let response
  try {
    response = await fetch(`${BASE_URL}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new HttpError(0, '网络异常，请确认后端服务已启动')
  }

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized()
    const data = await response.json().catch(() => null)
    throw new HttpError(response.status, data?.message || errorMessage)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export default request
