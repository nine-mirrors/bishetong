import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getToken, onUnauthorized, request, setToken } from './request.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('request', () => {
  beforeEach(() => {
    localStorage.clear()
    onUnauthorized(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('setToken / getToken / clearToken 读写 localStorage', () => {
    expect(getToken()).toBe('')
    setToken('abc')
    expect(getToken()).toBe('abc')
    clearToken()
    expect(getToken()).toBe('')
  })

  it('自动拼接 query 参数并携带 Token，忽略空值', async () => {
    setToken('token-1')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await request('/projects', { params: { page: 1, keyword: '', empty: null } })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/projects?page=1')
    expect(options.headers.Authorization).toBe('Bearer token-1')
    expect(options.method).toBe('GET')
  })

  it('401 时清理 Token 并触发统一登出回调', async () => {
    setToken('expired')
    const handler = vi.fn()
    onUnauthorized(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: '登录已失效' }, 401)))

    await expect(request('/projects')).rejects.toMatchObject({
      status: 401,
      message: '登录已失效',
    })
    expect(getToken()).toBe('')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('网络异常转换为 status 0 的可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(request('/projects')).rejects.toMatchObject({
      status: 0,
      message: '网络异常，请确认后端服务已启动',
    })
  })
})
