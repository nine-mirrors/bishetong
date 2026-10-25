// ── 课题：列表 / 详情 / 发布 / 学生申请 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'
import { notify, writeLog } from '../services/notification.service.js'

const router = Router()

router.use(authenticate)

// 课题列表：支持关键词、状态筛选、分页
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { keyword = '', status = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)

    const where = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
        : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          advisor: { select: { id: true, name: true, department: true } },
          applications: { select: { id: true, studentId: true, status: true } },
        },
      }),
      prisma.topic.count({ where }),
    ])

    const list = rows.map(({ applications, ...topic }) => ({
      ...topic,
      approvedCount: applications.filter((item) => item.status === 'APPROVED').length,
      myApplication: applications.find((item) => item.studentId === req.user.id) || null,
    }))

    res.json({ list, total, page, pageSize })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        advisor: { select: { id: true, name: true, department: true } },
        applications: {
          select: { id: true, studentId: true, status: true },
        },
      },
    })
    if (!topic) throw new HttpError(404, '课题不存在')

    const { applications, ...rest } = topic
    res.json({
      ...rest,
      approvedCount: applications.filter((item) => item.status === 'APPROVED').length,
      myApplication: applications.find((item) => item.studentId === req.user.id) || null,
    })
  }),
)

// 导师 / 教务发布课题
router.post(
  '/',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { title, description, capacity } = req.body || {}
    if (!title || !description) throw new HttpError(400, '课题名称和简介不能为空')

    const seats = Number(capacity) || 1
    if (seats < 1 || seats > 5) throw new HttpError(400, '名额需在 1—5 之间')

    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        capacity: seats,
        advisorId: req.user.id,
      },
    })

    res.status(201).json(topic)
  }),
)

// 学生申请课题
router.post(
  '/:id/apply',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const { statement } = req.body || {}
    if (!statement || String(statement).trim().length < 10) {
      throw new HttpError(400, '申请理由至少 10 个字')
    }

    const topic = await prisma.topic.findUnique({ where: { id: req.params.id } })
    if (!topic) throw new HttpError(404, '课题不存在')
    if (topic.status !== 'OPEN') throw new HttpError(409, '该课题已关闭申请')

    const exists = await prisma.topicApplication.findUnique({
      where: { topicId_studentId: { topicId: topic.id, studentId: req.user.id } },
    })
    if (exists) throw new HttpError(409, '你已经申请过该课题')

    const activeProject = await prisma.project.findFirst({
      where: { studentId: req.user.id, status: 'ACTIVE' },
    })
    if (activeProject) throw new HttpError(409, '你已有进行中的毕业设计项目，不能重复申请')

    const approvedCount = await prisma.topicApplication.count({
      where: { topicId: topic.id, status: 'APPROVED' },
    })
    if (approvedCount >= topic.capacity) throw new HttpError(409, '该课题名额已满')

    const application = await prisma.topicApplication.create({
      data: { topicId: topic.id, studentId: req.user.id, statement },
    })

    await notify(prisma, {
      userId: topic.advisorId,
      type: 'APPLICATION_SUBMITTED',
      title: '收到新的课题申请',
      content: `有学生申请了你的课题《${topic.title}》，请及时审核。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'APPLY_TOPIC',
      targetType: 'TOPIC',
      targetId: topic.id,
    })

    res.status(201).json(application)
  }),
)

export default router
