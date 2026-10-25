// ── 课题申请：列表 / 导师审核 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'
import { notify, writeLog } from '../services/notification.service.js'
import { buildDefaultMilestones } from '../services/project.service.js'

const router = Router()

router.use(authenticate)

// 申请列表：学生看自己，导师看自己课题下的申请，教务看全部
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)

    const scope =
      req.user.role === 'STUDENT'
        ? { studentId: req.user.id }
        : req.user.role === 'ADVISOR'
          ? { topic: { advisorId: req.user.id } }
          : {}

    const where = { ...scope, ...(status ? { status } : {}) }

    const [list, total] = await Promise.all([
      prisma.topicApplication.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              capacity: true,
              advisor: { select: { id: true, name: true } },
            },
          },
          student: {
            select: { id: true, name: true, studentNo: true, department: true },
          },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.topicApplication.count({ where }),
    ])

    res.json({ list, total, page, pageSize })
  }),
)

// 导师 / 教务审核申请：通过后自动立项并生成默认里程碑
router.put(
  '/:id/review',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { action, reviewComment = '' } = req.body || {}
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      throw new HttpError(400, '审核结果只能是 APPROVED 或 REJECTED')
    }

    const application = await prisma.topicApplication.findUnique({
      where: { id: req.params.id },
      include: { topic: true, student: { select: { id: true, name: true } } },
    })
    if (!application) throw new HttpError(404, '申请不存在')
    if (application.status !== 'PENDING') throw new HttpError(409, '该申请已处理')
    if (req.user.role === 'ADVISOR' && application.topic.advisorId !== req.user.id) {
      throw new HttpError(403, '只能审核自己发布的课题')
    }

    if (action === 'REJECTED') {
      await prisma.$transaction(async (tx) => {
        await tx.topicApplication.update({
          where: { id: application.id },
          data: { status: 'REJECTED', reviewedById: req.user.id, reviewComment },
        })
        await notify(tx, {
          userId: application.studentId,
          type: 'APPLICATION_REJECTED',
          title: '课题申请未通过',
          content: `你申请的课题《${application.topic.title}》未通过。${reviewComment || ''}`,
        })
        await writeLog(tx, {
          userId: req.user.id,
          action: 'REJECT_APPLICATION',
          targetType: 'APPLICATION',
          targetId: application.id,
        })
      })
      return res.json({ message: '已驳回该申请' })
    }

    const approvedCount = await prisma.topicApplication.count({
      where: { topicId: application.topicId, status: 'APPROVED' },
    })
    if (approvedCount >= application.topic.capacity) {
      throw new HttpError(409, '该课题名额已满')
    }

    const project = await prisma.$transaction(async (tx) => {
      const activeProject = await tx.project.findFirst({
        where: { studentId: application.studentId, status: 'ACTIVE' },
      })
      if (activeProject) throw new HttpError(409, '该学生已有进行中的毕业设计项目')

      await tx.topicApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedById: req.user.id, reviewComment },
      })

      const created = await tx.project.create({
        data: {
          topicId: application.topicId,
          studentId: application.studentId,
          advisorId: application.topic.advisorId,
          title: application.topic.title,
          currentPhase: 'TOPIC',
          startDate: new Date(),
          milestones: { create: buildDefaultMilestones() },
        },
      })

      if (approvedCount + 1 >= application.topic.capacity) {
        await tx.topic.update({
          where: { id: application.topicId },
          data: { status: 'CLOSED' },
        })
      }

      await notify(tx, {
        userId: application.studentId,
        type: 'APPLICATION_APPROVED',
        title: '课题申请已通过',
        content: `你申请的课题《${application.topic.title}》已通过，已为你创建毕业设计项目与默认里程碑。`,
      })
      await writeLog(tx, {
        userId: req.user.id,
        action: 'APPROVE_APPLICATION',
        targetType: 'APPLICATION',
        targetId: application.id,
      })

      return created
    })

    return res.json({ message: '已通过申请', projectId: project.id })
  }),
)

export default router
