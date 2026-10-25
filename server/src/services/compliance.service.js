// ── 毕业设计合规检查（规则引擎） ──
const THESIS_PATTERN = /论文|正文|设计说明书|thesis/i

export function computeCompliance({
  taskBook = null,
  guidanceRecords = [],
  milestones = [],
  documents = [],
  grade = null,
}) {
  const approvedPhases = new Set(
    milestones.filter((item) => item.status === 'APPROVED').map((item) => item.phase),
  )
  const guidanceCount = guidanceRecords.length
  const hasThesisByName = documents.some((item) => THESIS_PATTERN.test(item.fileName || ''))
  const hasThesisByText = documents.some((item) => {
    const text = String(item.textContent || '')
    return text.length > 500 && /摘要/.test(text) && /关键词/.test(text)
  })
  const hasThesis = hasThesisByName || hasThesisByText
  const plagiarismRate = grade?.plagiarismRate

  const factors = [
    {
      key: 'taskBook',
      label: '任务书已确认',
      weight: 20,
      ratio: taskBook?.status === 'CONFIRMED' ? 1 : 0,
      advice: '请导师下达任务书，学生确认后生效',
    },
    {
      key: 'guidance',
      label: '指导记录不少于 6 次',
      weight: 20,
      ratio: Math.min(1, guidanceCount / 6),
      advice: `已记录 ${guidanceCount} 次，建议每周至少 1 次`,
    },
    {
      key: 'proposal',
      label: '开题报告已通过',
      weight: 20,
      ratio: approvedPhases.has('PROPOSAL') ? 1 : 0,
      advice: '提交开题报告并取得导师批阅通过',
    },
    {
      key: 'midterm',
      label: '中期检查已通过',
      weight: 20,
      ratio: approvedPhases.has('MIDTERM') ? 1 : 0,
      advice: '提交中期检查材料并取得导师批阅通过',
    },
    {
      key: 'thesis',
      label: '论文 / 设计说明书已上传',
      weight: 15,
      ratio: hasThesis ? 1 : 0,
      advice: '上传论文或设计说明书，文件名需包含“论文/正文/设计说明书”',
    },
    {
      key: 'plagiarism',
      label: '查重率不超过 30%',
      weight: 5,
      ratio: plagiarismRate !== null && plagiarismRate !== undefined && plagiarismRate <= 30 ? 1 : 0,
      advice: plagiarismRate === null || plagiarismRate === undefined
        ? '尚未录入查重率'
        : `当前查重率 ${plagiarismRate}%，请修改后复检`,
    },
  ]

  const score = Math.round(
    factors.reduce((sum, item) => sum + item.weight * item.ratio, 0),
  )

  const level = score >= 80 ? 'READY' : score >= 50 ? 'RISK' : 'BLOCKED'
  const levelLabel = level === 'READY' ? '可提交' : level === 'RISK' ? '需完善' : '未就绪'

  return {
    score,
    level,
    levelLabel,
    factors: factors.map((item) => ({
      key: item.key,
      label: item.label,
      weight: item.weight,
      ratio: Number(item.ratio.toFixed(2)),
      passed: item.ratio >= 1,
      advice: item.advice,
    })),
    summary: {
      guidanceCount,
      hasThesis,
      plagiarismRate: plagiarismRate ?? null,
    },
  }
}
