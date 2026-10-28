// ── 数据看板聚合统计 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { computeRisk } from '../services/risk.service.js'
import { PHASE_ORDER } from '../services/project.service.js'

const router = Router()

router.use(authenticate)

const PHASE_LABELS = {
  TOPIC: '选题',
  PROPOSAL: '开题',
  MIDTERM: '中期',
  DEFENSE: '答辩',
  ARCHIVED: '已归档',
}

const RISK_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

router.get(
  '/overview',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const projectWhere = req.user.role === 'ADVISOR' ? { advisorId: req.user.id } : {}
    const applicationWhere =
      req.user.role === 'ADVISOR'
        ? { status: 'PENDING', topic: { advisorId: req.user.id } }
        : { status: 'PENDING' }

    // 规模说明：当前按学院体量（千级项目）一次性聚合并用纯函数计算风险。
    // 若项目数继续增长，可将 phase / grade 分布改为 prisma.groupBy + SQL 聚合，
    // 风险分迁移到定时任务或缓存，接口只读取聚合结果。
    const [projects, pendingApplications, studentCount] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        include: {
          milestones: true,
          advisor: { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
          grade: true,
        },
      }),
      prisma.topicApplication.count({ where: applicationWhere }),
      req.user.role === 'ADMIN'
        ? prisma.user.count({ where: { role: 'STUDENT' } })
        : prisma.project.count({ where: projectWhere }),
    ])

    const phaseDistribution = PHASE_ORDER.map((phase) => ({
      key: phase,
      label: PHASE_LABELS[phase],
      count: projects.filter((item) => item.currentPhase === phase).length,
    }))

    const riskList = projects.map((project) => ({
      projectId: project.id,
      title: project.title,
      student: project.student.name,
      risk: computeRisk(project),
    }))

    const riskDistribution = ['HIGH', 'MEDIUM', 'LOW'].map((level) => ({
      key: level,
      label: RISK_LABELS[level],
      count: riskList.filter((item) => item.risk.level === level).length,
    }))

    const riskByProject = new Map(riskList.map((item) => [item.projectId, item.risk]))

    const overdueMilestones = projects.reduce(
      (sum, project) => sum + (riskByProject.get(project.id)?.summary.overdue || 0),
      0,
    )
    const pendingReviewMilestones = projects.reduce(
      (sum, project) => sum + (riskByProject.get(project.id)?.summary.pendingReview || 0),
      0,
    )

    let advisorLoad = []
    if (req.user.role === 'ADMIN') {
      const loadMap = new Map()
      projects.forEach((project) => {
        const entry = loadMap.get(project.advisor.id) || {
          advisorId: project.advisor.id,
          name: project.advisor.name,
          count: 0,
        }
        entry.count += 1
        loadMap.set(project.advisor.id, entry)
      })
      advisorLoad = [...loadMap.values()].sort((a, b) => b.count - a.count)
    }

    const graded = projects.filter(
      (project) => project.grade?.finalScore !== null && project.grade?.finalScore !== undefined,
    )
    const average = graded.length
      ? Number(
          (
            graded.reduce((sum, project) => sum + project.grade.finalScore, 0) / graded.length
          ).toFixed(1),
        )
      : null
    const gradeLevels = ['优秀', '良好', '中等', '及格', '不及格']
    const gradeSummary = {
      total: projects.length,
      graded: graded.length,
      published: projects.filter((project) => project.grade?.status === 'PUBLISHED').length,
      average,
      distribution: gradeLevels.map((level) => ({
        level,
        count: graded.filter((project) => project.grade.level === level).length,
      })),
    }

    let quality = null
    if (req.user.role === 'ADMIN') {
      const [blindTotal, blindSubmitted, excellentCount] = await Promise.all([
        prisma.blindReview.count(),
        prisma.blindReview.count({ where: { status: 'SUBMITTED' } }),
        prisma.excellentAward.count(),
      ])
      quality = {
        blindTotal,
        blindSubmitted,
        blindPending: blindTotal - blindSubmitted,
        excellentCount,
      }
    }

    res.json({
      projectTotal: projects.length,
      studentCount,
      pendingApplications,
      overdueMilestones,
      pendingReviewMilestones,
      phaseDistribution,
      riskDistribution,
      advisorLoad,
      gradeSummary,
      quality,
      topRiskProjects: riskList
        .sort((a, b) => b.risk.score - a.risk.score)
        .slice(0, 5)
        .map((item) => ({
          projectId: item.projectId,
          title: item.title,
          student: item.student,
          score: item.risk.score,
          level: item.risk.level,
          levelLabel: item.risk.levelLabel,
        })),
    })
  }),
)

export default router
