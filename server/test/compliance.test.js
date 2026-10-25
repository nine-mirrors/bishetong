// ── 合规检查单元测试 ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCompliance } from '../src/services/compliance.service.js'

test('全部条件满足时得 100 分且可提交', () => {
  const result = computeCompliance({
    taskBook: { status: 'CONFIRMED' },
    guidanceRecords: Array.from({ length: 6 }, () => ({})),
    milestones: [
      { phase: 'PROPOSAL', status: 'APPROVED' },
      { phase: 'MIDTERM', status: 'APPROVED' },
    ],
    documents: [{ fileName: '毕业设计论文.pdf' }],
    grade: { plagiarismRate: 12 },
  })

  assert.equal(result.score, 100)
  assert.equal(result.level, 'READY')
  assert.ok(result.factors.every((item) => item.passed))
})

test('缺少任务书与开题时判定为未就绪并给出建议', () => {
  const result = computeCompliance({
    taskBook: null,
    guidanceRecords: [],
    milestones: [],
    documents: [],
    grade: null,
  })

  assert.equal(result.score, 0)
  assert.equal(result.level, 'BLOCKED')
  assert.equal(result.factors.find((item) => item.key === 'taskBook').passed, false)
  assert.ok(result.factors.find((item) => item.key === 'guidance').advice.includes('0'))
})

test('指导记录与中期检查部分完成时处于需完善区间', () => {
  const result = computeCompliance({
    taskBook: { status: 'CONFIRMED' },
    guidanceRecords: Array.from({ length: 3 }, () => ({})),
    milestones: [{ phase: 'MIDTERM', status: 'APPROVED' }],
    documents: [{ fileName: '设计说明书.docx' }],
    grade: { plagiarismRate: 28 },
  })

  assert.ok(result.score >= 50 && result.score < 100)
  assert.equal(result.level, 'RISK')
  assert.equal(result.factors.find((item) => item.key === 'guidance').passed, false)
})

test('文件名不含论文关键词时，可通过解析文本识别论文', () => {
  const text = `摘要\n${'本文围绕毕业设计过程管理展开研究。'.repeat(40)}\n关键词\n毕业设计；过程管理`
  const result = computeCompliance({
    taskBook: { status: 'CONFIRMED' },
    guidanceRecords: Array.from({ length: 6 }, () => ({})),
    milestones: [
      { phase: 'PROPOSAL', status: 'APPROVED' },
      { phase: 'MIDTERM', status: 'APPROVED' },
    ],
    documents: [{ fileName: '最终材料.md', textContent: text }],
    grade: { plagiarismRate: 10 },
  })

  assert.equal(result.factors.find((item) => item.key === 'thesis').passed, true)
  assert.equal(result.score, 100)
})
