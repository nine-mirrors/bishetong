// ── 优秀论文评选 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { computeCompliance } from '../services/compliance.service.js'
import { evaluateAwardEligibility } from '../services/excellent.service.js'
import { notify, writeLog } from '../services/notification.service.js'
import { getOptionalPagination } from '../utils/pagination.js'

const router = Router()

router.use(authenticate)

const projectInclude = {
  student: { select: { id: true, name: true, studentNo: true } },
  advisor: { select: { id: true, name: true } },
  grade: true,
  taskBook: true,
  milestones: true,
  guidanceRecords: true,
  documents: true,
  excellentAward: true,
}

router.get(
  '/candidates',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const paging = getOptionalPagination(req.query)
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        ...(paging ? { skip: paging.skip, take: paging.take } : {}),
        orderBy: { createdAt: 'desc' },
        include: projectInclude,
      }),
      paging ? prisma.project.count() : null,
    ])

    const list = projects.map((project) => {
      const compliance = computeCompliance(project)
      const eligibility = evaluateAwardEligibility({
        grade: project.grade,
        compliance,
      })
      return {
        projectId: project.id,
        title: project.title,
        student: project.student,
        advisor: project.advisor,
        finalScore: project.grade?.finalScore ?? null,
        level: project.grade?.level || '',
        gradeStatus: project.grade?.status || 'NONE',
        plagiarismRate: project.grade?.plagiarismRate ?? null,
        complianceScore: compliance.score,
        complianceLevel: compliance.levelLabel,
        eligible: eligibility.eligible,
        reasons: eligibility.reasons,
        award: project.excellentAward,
      }
    })

    if (paging) {
      res.json({ list, total, page: paging.page, pageSize: paging.pageSize })
      return
    }
    res.json(list)
  }),
)

router.get(
  '/awards',
  asyncHandler(async (req, res) => {
    const paging = getOptionalPagination(req.query)
    const [list, total] = await Promise.all([
      prisma.excellentAward.findMany({
        ...(paging ? { skip: paging.skip, take: paging.take } : {}),
        orderBy: { awardedAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              student: { select: { name: true, department: true } },
              advisor: { select: { name: true } },
            },
          },
        },
      }),
      paging ? prisma.excellentAward.count() : null,
    ])
    if (paging) {
      res.json({ list, total, page: paging.page, pageSize: paging.pageSize })
      return
    }
    res.json(list)
  }),
)

router.post(
  '/awards',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { projectId, level = 'COLLEGE', remark = '' } = req.body || {}
    if (!['SCHOOL', 'COLLEGE'].includes(level)) throw new HttpError(400, '非法的获奖等级')

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    })
    if (!project) throw new HttpError(404, '项目不存在')

    const compliance = computeCompliance(project)
    const eligibility = evaluateAwardEligibility({ grade: project.grade, compliance })
    if (!eligibility.eligible) {
      throw new HttpError(409, `不满足评选条件：${eligibility.reasons.join('；')}`)
    }

    const award = await prisma.excellentAward.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        level,
        remark: String(remark).trim() || null,
        awardedById: req.user.id,
      },
      update: {
        level,
        remark: String(remark).trim() || null,
        awardedById: req.user.id,
        awardedAt: new Date(),
      },
    })

    await notify(prisma, {
      userId: project.studentId,
      type: 'SYSTEM',
      title: '毕业设计获评优秀论文',
      content: `《${project.title}》已获评${level === 'SCHOOL' ? '校级' : '院级'}优秀论文。`,
    })
    await notify(prisma, {
      userId: project.advisorId,
      type: 'SYSTEM',
      title: '指导学生获评优秀论文',
      content: `你指导的《${project.title}》已获评${level === 'SCHOOL' ? '校级' : '院级'}优秀论文。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'AWARD_EXCELLENT',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.status(201).json(award)
  }),
)

router.delete(
  '/awards/:projectId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const award = await prisma.excellentAward.findUnique({
      where: { projectId: req.params.projectId },
    })
    if (!award) throw new HttpError(404, '该论文尚未获奖')

    await prisma.excellentAward.delete({ where: { projectId: req.params.projectId } })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'REVOKE_EXCELLENT',
      targetType: 'PROJECT',
      targetId: req.params.projectId,
    })

    res.json({ message: '已撤销' })
  }),
)

export default router
