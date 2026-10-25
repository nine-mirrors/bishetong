// ── 项目默认里程碑 ──
export const DEFAULT_MILESTONES = [
  { name: '开题报告提交', phase: 'PROPOSAL', offsetDays: 30 },
  { name: '中期检查材料', phase: 'MIDTERM', offsetDays: 60 },
  { name: '答辩材料提交', phase: 'DEFENSE', offsetDays: 90 },
]

export function buildDefaultMilestones(start = new Date()) {
  return DEFAULT_MILESTONES.map((item) => ({
    name: item.name,
    phase: item.phase,
    dueDate: new Date(start.getTime() + item.offsetDays * 24 * 60 * 60 * 1000),
  }))
}

/** 阶段推进顺序 */
export const PHASE_ORDER = ['TOPIC', 'PROPOSAL', 'MIDTERM', 'DEFENSE', 'ARCHIVED']
