// ── 项目、里程碑、文档接口 ──
import { downloadFile, request } from './request.js'

export function fetchProjects(params) {
  return request('/projects', { params })
}

export function fetchProjectDetail(id) {
  return request(`/projects/${id}`)
}

export function advanceProjectPhase(id, phase) {
  return request(`/projects/${id}/phase`, { method: 'PATCH', body: { phase } })
}

export function remindProjects(projectIds) {
  return request('/projects/remind', { method: 'POST', body: { projectIds } })
}

export function submitMilestone(id) {
  return request(`/milestones/${id}/submit`, { method: 'PUT' })
}

export function reviewMilestone(id, payload) {
  return request(`/milestones/${id}/review`, { method: 'PUT', body: payload })
}

export function uploadProjectDocument(id, { file, milestoneId = '' }) {
  const formData = new FormData()
  formData.append('file', file)
  if (milestoneId) formData.append('milestoneId', milestoneId)
  return request(`/projects/${id}/documents`, { method: 'POST', body: formData, timeout: 60000 })
}

export function parseProjectDocument(projectId, documentId) {
  return request(`/projects/${projectId}/documents/${documentId}/parse`, { method: 'POST' })
}

export function fetchDocumentContent(projectId, documentId) {
  return request(`/projects/${projectId}/documents/${documentId}/content`)
}

export function downloadProjectDocument(projectId, documentId, filename) {
  return downloadFile(
    `/projects/${projectId}/documents/${documentId}/download`,
    filename,
    '下载文档失败',
  )
}

// ── 任务书 ──
export function fetchTaskBook(projectId) {
  return request(`/projects/${projectId}/taskbook`)
}

export function saveTaskBook(projectId, payload) {
  return request(`/projects/${projectId}/taskbook`, { method: 'PUT', body: payload })
}

export function confirmTaskBook(projectId) {
  return request(`/projects/${projectId}/taskbook/confirm`, { method: 'POST' })
}

// ── 指导记录 ──
export function fetchGuidance(projectId) {
  return request(`/projects/${projectId}/guidance`)
}

export function createGuidance(projectId, payload) {
  return request(`/projects/${projectId}/guidance`, { method: 'POST', body: payload })
}

export function feedbackGuidance(projectId, recordId, feedback) {
  return request(`/projects/${projectId}/guidance/${recordId}/feedback`, {
    method: 'PUT',
    body: { feedback },
  })
}

// ── 评阅与成绩 ──
export function fetchGrade(projectId) {
  return request(`/projects/${projectId}/grade`)
}

export function saveGrade(projectId, payload) {
  return request(`/projects/${projectId}/grade`, { method: 'PUT', body: payload })
}

export function publishGrade(projectId) {
  return request(`/projects/${projectId}/grade/publish`, { method: 'POST' })
}

// ── 合规检查 ──
export function fetchCompliance(projectId) {
  return request(`/projects/${projectId}/compliance`)
}

// ── 电子签章 ──
export function fetchSignatures(projectId) {
  return request(`/projects/${projectId}/signatures`)
}

export function signProject(projectId, imageData) {
  return request(`/projects/${projectId}/signatures`, { method: 'POST', body: { imageData } })
}

// ── 归档 ──
export function fetchArchive(projectId) {
  return request(`/projects/${projectId}/archive`)
}

export function archiveProject(projectId) {
  return request(`/projects/${projectId}/archive`, { method: 'POST' })
}

export function verifyArchive(projectId) {
  return request(`/projects/${projectId}/archive/verify`)
}

export function downloadArchive(projectId, filename) {
  return downloadFile(`/projects/${projectId}/archive/download`, filename, '下载归档文件失败')
}

export function downloadTimestamp(projectId, filename) {
  return downloadFile(`/projects/${projectId}/archive/timestamp`, filename, '下载时间戳凭证失败')
}
