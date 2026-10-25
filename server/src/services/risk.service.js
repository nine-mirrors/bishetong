// ── 进度风险评分 ──
// 纯函数实现：输入项目与里程碑，输出 0—100 的风险分、等级与可解释的风险因子
const DAY_MS = 24 * 60 * 60 * 1000

export const RISK_WEIGHTS = {
  overdue: 0.35,
  completion: 0.25,
  deadline: 0.2,
  review: 0.2,
}

const FACTOR_META = {
  overdue: {
    label: '里程碑逾期',
    advice: '尽快补齐逾期材料，或与导师沟通调整计划节点',
  },
  completion: {
    label: '整体完成度偏低',
    advice: '按阶段拆分任务，优先推进未开始的里程碑',
  },
  deadline: {
    label: '临近截止时间',
    advice: '最近一个里程碑即将到期，建议提前准备并预约批阅',
  },
  review: {
    label: '等待批阅时间过长',
    advice: '材料提交后长时间未批阅，可提醒导师或教务介入',
  },
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round(value) {
  return Math.round(value)
}

export function computeRisk(project, now = new Date()) {
  const milestones = Array.isArray(project?.milestones) ? project.milestones : []
  const total = milestones.length

  const approved = milestones.filter((item) => item.status === 'APPROVED')
  const overdue = milestones.filter(
    (item) =>
      item.status !== 'APPROVED' &&
      item.dueDate &&
      new Date(item.dueDate).getTime() < now.getTime(),
  )
  const overdueDays = overdue.reduce(
    (sum, item) =>
      sum + Math.max(0, Math.floor((now.getTime() - new Date(item.dueDate).getTime()) / DAY_MS)),
    0,
  )

  const submitted = milestones.filter((item) => item.status === 'SUBMITTED' && item.submittedAt)
  const avgReviewWaitDays = submitted.length
    ? submitted.reduce(
      (sum, item) =>
        sum + Math.max(0, (now.getTime() - new Date(item.submittedAt).getTime()) / DAY_MS),
      0,
    ) / submitted.length
    : 0

  const upcoming = milestones.filter(
    (item) =>
      item.status !== 'APPROVED' &&
      item.dueDate &&
      new Date(item.dueDate).getTime() >= now.getTime(),
  )
  const nearestDueDays = upcoming.length
    ? Math.min(
      ...upcoming.map((item) =>
        Math.floor((new Date(item.dueDate).getTime() - now.getTime()) / DAY_MS),
      ),
    )
    : null

  const raw = {
    overdue: total ? clamp01((overdue.length / total) * 0.6 + overdueDays / 60) : 0,
    completion: total ? clamp01(1 - approved.length / total) : 0,
    deadline:
      nearestDueDays === null || total === 0 ? 0 : clamp01(1 - nearestDueDays / 14),
    review: clamp01(avgReviewWaitDays / 7),
  }

  const factors = Object.keys(RISK_WEIGHTS).map((key) => {
    const contribution = raw[key] * RISK_WEIGHTS[key] * 100
    return {
      key,
      label: FACTOR_META[key].label,
      advice: FACTOR_META[key].advice,
      weight: RISK_WEIGHTS[key],
      raw: Number(raw[key].toFixed(3)),
      contribution: round(contribution),
    }
  })

  const score = Math.min(100, Math.max(0, round(factors.reduce((sum, item) => sum + item.contribution, 0))))

  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW'
  const levelLabel = level === 'HIGH' ? '高风险' : level === 'MEDIUM' ? '中风险' : '低风险'

  return {
    score,
    level,
    levelLabel,
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    summary: {
      total,
      approved: approved.length,
      overdue: overdue.length,
      overdueDays,
      pendingReview: submitted.length,
      pending: total - approved.length,
      nearestDueDays,
      avgReviewWaitDays: Number(avgReviewWaitDays.toFixed(1)),
    },
  }
}
