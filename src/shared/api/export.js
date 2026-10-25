// ── CSV 导出 ──
import { getToken, HttpError } from './request.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function downloadCsv(path, filename) {
  const token = getToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new HttpError(response.status, '导出失败，请稍后重试')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
