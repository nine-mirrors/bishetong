// ── 优秀论文评选规则测试 ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAwardEligibility } from '../src/services/excellent.service.js'

const approvedGrade = {
  status: 'PUBLISHED',
  finalScore: 90,
  plagiarismRate: 12,
}

const strongCompliance = { score: 90 }

test('成绩、查重与合规均达标时具备评选资格', () => {
  const result = evaluateAwardEligibility({
    grade: approvedGrade,
    compliance: strongCompliance,
  })
  assert.equal(result.eligible, true)
  assert.deepEqual(result.reasons, [])
})

test('成绩未发布或总分不足时不可评选并给出原因', () => {
  const result = evaluateAwardEligibility({
    grade: { ...approvedGrade, status: 'DRAFT', finalScore: 78 },
    compliance: strongCompliance,
  })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((item) => item.includes('成绩尚未发布')))
  assert.ok(result.reasons.some((item) => item.includes('85')))
})

test('查重或合规不达标时不可评选', () => {
  const result = evaluateAwardEligibility({
    grade: { ...approvedGrade, plagiarismRate: 35 },
    compliance: { score: 65 },
  })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((item) => item.includes('查重率')))
  assert.ok(result.reasons.some((item) => item.includes('合规检查')))
})
