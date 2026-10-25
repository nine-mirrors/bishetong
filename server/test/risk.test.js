// ── 风险评分单元测试（node:test） ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeRisk } from '../src/services/risk.service.js'

const now = new Date('2026-06-01T00:00:00.000Z')

function daysFromNow(days) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

test('没有里程碑时风险为 0 且不产生 NaN', () => {
  const risk = computeRisk({ milestones: [] }, now)
  assert.equal(risk.score, 0)
  assert.equal(risk.level, 'LOW')
  assert.equal(risk.summary.total, 0)
  assert.ok(Number.isFinite(risk.score))
})

test('全部里程碑通过时为低风险', () => {
  const risk = computeRisk(
    {
      milestones: [
        { status: 'APPROVED', dueDate: daysFromNow(-10) },
        { status: 'APPROVED', dueDate: daysFromNow(-5) },
      ],
    },
    now,
  )
  assert.equal(risk.score, 0)
  assert.equal(risk.level, 'LOW')
  assert.equal(risk.summary.approved, 2)
})

test('多项逾期时判定为高风险', () => {
  const risk = computeRisk(
    {
      milestones: [
        { status: 'PENDING', dueDate: daysFromNow(-30) },
        { status: 'PENDING', dueDate: daysFromNow(-20) },
        { status: 'PENDING', dueDate: daysFromNow(-10) },
      ],
    },
    now,
  )
  assert.equal(risk.level, 'HIGH')
  assert.equal(risk.summary.overdue, 3)
  assert.ok(risk.score >= 60)
})

test('提交后长时间未批阅会提升风险', () => {
  const risk = computeRisk(
    {
      milestones: [
        {
          status: 'SUBMITTED',
          submittedAt: daysFromNow(-10),
          dueDate: daysFromNow(30),
        },
        { status: 'PENDING', dueDate: daysFromNow(60) },
      ],
    },
    now,
  )
  const reviewFactor = risk.factors.find((item) => item.key === 'review')
  assert.ok(reviewFactor.raw > 0.9)
  assert.ok(risk.score > 30)
})

test('风险分始终在 0 到 100 之间，因子按贡献降序', () => {
  const risk = computeRisk(
    {
      milestones: [
        { status: 'PENDING', dueDate: daysFromNow(-100) },
        { status: 'REJECTED', submittedAt: daysFromNow(-30), dueDate: daysFromNow(-20) },
      ],
    },
    now,
  )
  assert.ok(risk.score >= 0 && risk.score <= 100)
  const contributions = risk.factors.map((item) => item.contribution)
  const sorted = [...contributions].sort((a, b) => b - a)
  assert.deepEqual(contributions, sorted)
})

test('临近截止时间会增加截止因子风险', () => {
  const risk = computeRisk(
    { milestones: [{ status: 'PENDING', dueDate: daysFromNow(2) }] },
    now,
  )
  const deadlineFactor = risk.factors.find((item) => item.key === 'deadline')
  assert.ok(deadlineFactor.raw > 0.8)
})
