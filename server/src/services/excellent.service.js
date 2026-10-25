// ── 优秀论文评选规则 ──
export const AWARD_RULES = {
  minFinalScore: 85,
  maxPlagiarismRate: 30,
  minComplianceScore: 80,
}

export function evaluateAwardEligibility({ grade, compliance }) {
  const reasons = []

  if (!grade || grade.status !== 'PUBLISHED') reasons.push('成绩尚未发布')
  if (!grade || grade.finalScore === null || grade.finalScore < AWARD_RULES.minFinalScore) {
    reasons.push(`总评需不低于 ${AWARD_RULES.minFinalScore} 分`)
  }
  if (grade?.plagiarismRate === null || grade?.plagiarismRate === undefined) {
    reasons.push('缺少查重率')
  } else if (grade.plagiarismRate > AWARD_RULES.maxPlagiarismRate) {
    reasons.push(`查重率需不超过 ${AWARD_RULES.maxPlagiarismRate}%`)
  }
  if (!compliance || compliance.score < AWARD_RULES.minComplianceScore) {
    reasons.push(`合规检查需不低于 ${AWARD_RULES.minComplianceScore} 分`)
  }

  return { eligible: reasons.length === 0, reasons }
}
