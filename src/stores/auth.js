// ── 认证状态 ──
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMeApi, loginApi, registerApi } from '@/shared/api/auth.js'
import { clearToken, getToken, setToken } from '@/shared/api/request.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const user = ref(null)

  const isLoggedIn = computed(() => Boolean(token.value))
  const role = computed(() => user.value?.role || '')
  const isStudent = computed(() => role.value === 'STUDENT')
  const isAdvisor = computed(() => role.value === 'ADVISOR')
  const isAdmin = computed(() => role.value === 'ADMIN')
  const canManage = computed(() => isAdvisor.value || isAdmin.value)

  async function login(payload) {
    const result = await loginApi(payload)
    token.value = result.token
    user.value = result.user
    setToken(result.token)
    return result.user
  }

  async function register(payload) {
    const result = await registerApi(payload)
    token.value = result.token
    user.value = result.user
    setToken(result.token)
    return result.user
  }

  async function loadMe() {
    if (!token.value) return null
    user.value = await fetchMeApi()
    return user.value
  }

  function logout() {
    token.value = ''
    user.value = null
    clearToken()
  }

  return {
    token,
    user,
    isLoggedIn,
    role,
    isStudent,
    isAdvisor,
    isAdmin,
    canManage,
    login,
    register,
    loadMe,
    logout,
  }
})
