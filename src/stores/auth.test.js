import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/shared/api/auth.js', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  fetchMeApi: vi.fn(),
}))

import { fetchMeApi, loginApi, registerApi } from '@/shared/api/auth.js'
import { getToken } from '@/shared/api/request.js'
import { useAuthStore } from './auth.js'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('login 保存用户、Token 与角色派生状态', async () => {
    loginApi.mockResolvedValue({ token: 't-student', user: { id: 'u1', role: 'STUDENT' } })
    const store = useAuthStore()

    await store.login({ email: 'a@demo.edu', password: '123456' })

    expect(store.isLoggedIn).toBe(true)
    expect(store.user.id).toBe('u1')
    expect(store.isStudent).toBe(true)
    expect(store.canManage).toBe(false)
    expect(getToken()).toBe('t-student')
  })

  it('register 成功后自动登录', async () => {
    registerApi.mockResolvedValue({ token: 't-new', user: { id: 'u2', role: 'STUDENT' } })
    const store = useAuthStore()

    await store.register({ email: 'new@demo.edu', password: '123456' })

    expect(store.user.id).toBe('u2')
    expect(getToken()).toBe('t-new')
  })

  it('没有 Token 时 loadMe 直接返回 null', async () => {
    const store = useAuthStore()
    await expect(store.loadMe()).resolves.toBeNull()
    expect(fetchMeApi).not.toHaveBeenCalled()
  })

  it('有 Token 时 loadMe 拉取并写入当前用户', async () => {
    localStorage.setItem('bishe_token', 't-me')
    fetchMeApi.mockResolvedValue({ id: 'u3', role: 'ADVISOR' })
    const store = useAuthStore()

    await store.loadMe()

    expect(store.user.id).toBe('u3')
    expect(store.isAdvisor).toBe(true)
    expect(store.canManage).toBe(true)
  })

  it('logout 清空内存状态与 localStorage', async () => {
    loginApi.mockResolvedValue({ token: 't', user: { id: 'u1', role: 'ADMIN' } })
    const store = useAuthStore()
    await store.login({ email: 'a@demo.edu', password: '123456' })

    store.logout()

    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
    expect(getToken()).toBe('')
  })
})
