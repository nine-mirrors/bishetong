// ── 里程碑：学生提交 / 导师批阅 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { notify, writeLog } from '../services/notification.service.js'

const router = Router()

router.use(authenticate)

router.put(
  '/:id/submit',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { id: true, studentId: true, advisorId: true, title: true } } },
    })
    if (!milestone) throw new HttpError(404, '里程碑不存在')
    if (milestone.project.studentId !== req.user.id) throw new HttpError(403, '只能提交自己的里程碑')
    if (!['PENDING', 'REJECTED'].includes(milestone.status)) {
      throw new HttpError(409, '该里程碑已提交，请等待批阅')
    }

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: req.user.id,
      },
    })

    await notify(prisma, {
      userId: milestone.project.advisorId,
      type: 'MILESTONE_SUBMITTED',
      title: '学生提交了里程碑材料',
      content: `《${milestone.project.title}》的「${milestone.name}」已提交，请批阅。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'SUBMIT_MILESTONE',
      targetType: 'MILESTONE',
      targetId: milestone.id,
    })

    res.json(updated)
  }),
)

router.put(
  '/:id/review',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { status, reviewComment = '' } = req.body || {}
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new HttpError(400, '批阅结果只能是 APPROVED 或 REJECTED')
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { id: true, studentId: true, advisorId: true, title: true } } },
    })
    if (!milestone) throw new HttpError(404, '里程碑不存在')
    if (req.user.role === 'ADVISOR' && milestone.project.advisorId !== req.user.id) {
      throw new HttpError(403, '只能批阅自己指导的项目')
    }
    if (milestone.status !== 'SUBMITTED') throw new HttpError(409, '该里程碑尚未提交')

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status, reviewComment, reviewedById: req.user.id },
    })

    await notify(prisma, {
      userId: milestone.project.studentId,
      type: 'MILESTONE_REVIEWED',
      title: status === 'APPROVED' ? '里程碑已通过' : '里程碑被退回',
      content: `《${milestone.project.title}》的「${milestone.name}」${
        status === 'APPROVED' ? '已通过批阅' : '被退回，请修改后重新提交'
      }。${reviewComment || ''}`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'REVIEW_MILESTONE',
      targetType: 'MILESTONE',
      targetId: milestone.id,
    })

    res.json(updated)
  }),
)

export default router
