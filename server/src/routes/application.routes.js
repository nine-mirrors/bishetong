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
        // 锁定申请行并复检，避免与“通过”操作并发时重复处理同一申请
        const [fresh] = await tx.$queryRaw`
          SELECT status FROM topic_applications WHERE id = ${application.id} FOR UPDATE
        `
        if (!fresh || fresh.status !== 'PENDING') throw new HttpError(409, '该申请已处理')

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

    const project = await prisma.$transaction(
      async (tx) => {
        // 行锁串行化同一课题的审核：两个审核人同时通过最后两个名额时，
        // 后到的事务会等待前一个提交后再计数，不会都读到旧的名额余量。
        await tx.$queryRaw`SELECT id FROM topics WHERE id = ${application.topicId} FOR UPDATE`
        // 行锁串行化同一学生的审核：同一学生的两条申请并发通过时只能建一个项目。
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${application.studentId} FOR UPDATE`

        const [fresh] = await tx.$queryRaw`
        SELECT status FROM topic_applications WHERE id = ${application.id} FOR UPDATE
      `
        if (!fresh || fresh.status !== 'PENDING') throw new HttpError(409, '该申请已处理')

        // 当前读 + 行锁：确保看到的是最新已通过数量，而不是事务开始时的快照。
        const approvedRows = await tx.$queryRaw`
        SELECT id FROM topic_applications
        WHERE topic_id = ${application.topicId} AND status = 'APPROVED'
        FOR UPDATE
      `
        if (approvedRows.length >= application.topic.capacity) {
          throw new HttpError(409, '该课题名额已满')
        }

        const activeProjects = await tx.$queryRaw`
        SELECT id FROM projects
        WHERE student_id = ${application.studentId} AND status = 'ACTIVE'
        FOR UPDATE
      `
        if (activeProjects.length > 0) {
          throw new HttpError(409, '该学生已有进行中的毕业设计项目')
        }

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

        if (approvedRows.length + 1 >= application.topic.capacity) {
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
      },
      { maxWait: 5000, timeout: 15000 },
    )

    return res.json({ message: '已通过申请', projectId: project.id })
  }),
)

export default router
