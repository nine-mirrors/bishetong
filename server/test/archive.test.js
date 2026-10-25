// ── 归档 HTML 单元测试 ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildArchiveHtml } from '../src/services/archive.service.js'

const baseProject = {
  title: '毕设通 <测试>',
  currentPhase: 'ARCHIVED',
  student: { name: '王小明', studentNo: '2021010101' },
  advisor: { name: '张明' },
  taskBook: { content: '任务书内容', requirements: '要求' },
  milestones: [
    { name: '开题报告', phase: 'PROPOSAL', dueDate: new Date(), status: 'APPROVED', submittedAt: new Date(), reviewComment: '通过' },
  ],
  guidanceRecords: [
    { weekNo: 1, content: '第一周进展', feedback: '继续', createdAt: new Date() },
  ],
  documents: [{ fileName: '论文.pdf', version: 1, createdAt: new Date() }],
  grade: {
    advisorScore: 88,
    reviewerScore: 85,
    defenseScore: 90,
    finalScore: 87.9,
    level: '良好',
    plagiarismRate: 12.5,
    defenseGroup: '第 2 组',
    defenseLocation: 'A305',
    defenseAt: new Date(),
  },
  signatures: [
    {
      role: 'STUDENT',
      imageData: 'data:image/png;base64,AAAA',
      signedAt: new Date(),
      user: { name: '王小明' },
    },
  ],
}

test('归档 HTML 包含关键章节并转义标题', () => {
  const html = buildArchiveHtml(baseProject)
  assert.ok(html.includes('毕设通 &lt;测试&gt;'))
  assert.ok(html.includes('任务书'))
  assert.ok(html.includes('指导记录'))
  assert.ok(html.includes('成绩与答辩'))
  assert.ok(html.includes('电子签章'))
  assert.ok(html.includes('87.9'))
  assert.ok(html.includes('data:image/png;base64,AAAA'))
})

test('缺少成绩与签名时仍能生成占位内容', () => {
  const html = buildArchiveHtml({
    ...baseProject,
    grade: null,
    signatures: [],
    guidanceRecords: [],
    milestones: [],
    documents: [],
    taskBook: null,
  })
  assert.ok(html.includes('暂无成绩记录'))
  assert.ok(html.includes('未签署'))
  assert.ok(html.includes('暂无里程碑'))
})
