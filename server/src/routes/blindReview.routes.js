// ── 盲审抽检 ──
import { Router } from 'express'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'
import { notify, writeLog } from '../services/notification.service.js'
import { sendUpload } from '../services/storage.service.js'

const router = Router()

router.use(authenticate)

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const reviewInclude = {
  project: { select: { id: true, title: true } },
  reviewer: { select: { id: true, name: true } },
}

// 可抽检项目：成绩已发布且尚未被抽检
router.get(
  '/candidates',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      where: { grade: { status: 'PUBLISHED' }, blindReviews: { none: {} } },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, studentNo: true } },
        advisor: { select: { name: true } },
        grade: { select: { finalScore: true, level: true, plagiarismRate: true } },
      },
    })
    res.json(projects)
  }),
)

// 随机抽取并自动分配评阅教师
router.post(
  '/sample',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const count = Number(req.body?.count)
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      throw new HttpError(400, '抽取数量需在 1—20 之间')
    }

    const candidates = await prisma.project.findMany({
      where: { grade: { status: 'PUBLISHED' }, blindReviews: { none: {} } },
      include: { advisor: { select: { id: true, name: true } } },
    })
    if (candidates.length === 0) throw new HttpError(409, '没有可抽检的项目（需先发布成绩）')

    const advisors = await prisma.user.findMany({
      where: { role: 'ADVISOR', isActive: true },
      select: { id: true, name: true },
    })
    if (advisors.length === 0) throw new HttpError(409, '没有可用的评阅教师')

    const picked = shuffle(candidates).slice(0, Math.min(count, candidates.length))
    const year = new Date().getFullYear()
    const prefix = `BR-${year}-`
    const existing = await prisma.blindReview.findMany({
      where: { anonymousCode: { startsWith: prefix } },
      select: { anonymousCode: true },
    })
    let serial = existing.reduce((max, item) => {
      const value = Number(item.anonymousCode.slice(prefix.length))
      return Number.isInteger(value) && value > max ? value : max
    }, 0)
    const created = []
    let cursor = 0

    for (const project of picked) {
      const available = advisors.filter((item) => item.id !== project.advisor.id)
      if (available.length === 0) continue
      const reviewer = available[cursor % available.length]
      cursor += 1
      serial += 1

      const review = await prisma.$transaction(async (tx) => {
        // 任务创建、通知与审计日志同事务，避免只写入一半
        const item = await tx.blindReview.create({
          data: {
            projectId: project.id,
            reviewerId: reviewer.id,
            anonymousCode: `${prefix}${String(serial).padStart(3, '0')}`,
          },
        })

        await notify(tx, {
          userId: reviewer.id,
          type: 'SYSTEM',
          title: '收到一份盲审任务',
          content: `你被抽取为盲审评阅教师，请进入“盲审评阅”完成任务。`,
        })
        await writeLog(tx, {
          userId: req.user.id,
          action: 'CREATE_BLIND_REVIEW',
          targetType: 'PROJECT',
          targetId: project.id,
        })
        return item
      })
      created.push(review)
    }

    if (created.length === 0) throw new HttpError(409, '可分配的评阅教师不足')
    res.status(201).json({ created: created.length })
  }),
)

// 教务查看全部盲审
router.get(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { status = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)
    const where = status ? { status } : {}

    const [list, total] = await Promise.all([
      prisma.blindReview.findMany({
        where,
        skip,
        take,
        orderBy: { assignedAt: 'desc' },
        include: reviewInclude,
      }),
      prisma.blindReview.count({ where }),
    ])

    res.json({ list, total, page, pageSize })
  }),
)

// 导师查看自己的盲审任务（不含学生与导师信息）
router.get(
  '/my',
  requireRole('ADVISOR'),
  asyncHandler(async (req, res) => {
    const list = await prisma.blindReview.findMany({
      where: { reviewerId: req.user.id },
      orderBy: { assignedAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            documents: {
              orderBy: { createdAt: 'desc' },
              select: { id: true, fileName: true, version: true },
            },
          },
        },
      },
    })
    res.json(list)
  }),
)

// 下载盲审材料：仅限被分配该任务的评阅教师，且下发文件名不暴露真实姓名
router.get(
  '/:id/documents/:docId/download',
  requireRole('ADVISOR'),
  asyncHandler(async (req, res) => {
    const review = await prisma.blindReview.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, '盲审任务不存在')
    if (review.reviewerId !== req.user.id) {
      throw new HttpError(403, '只能下载分配给自己的盲审材料')
    }

    const document = await prisma.document.findFirst({
      where: { id: req.params.docId, projectId: review.projectId },
      select: { filePath: true, fileName: true, version: true },
    })
    if (!document) throw new HttpError(404, '文档不存在')

    const ext = path.extname(document.fileName || '').toLowerCase()
    await sendUpload(res, document, {
      downloadName: `${review.anonymousCode}-v${document.version}${ext}`,
    })
  }),
)

// 导师提交盲审结果
router.post(
  '/:id/submit',
  requireRole('ADVISOR'),
  asyncHandler(async (req, res) => {
    const { score, comment } = req.body || {}
    const value = Number(score)
    if (Number.isNaN(value) || value < 0 || value > 100) {
      throw new HttpError(400, '评分需在 0—100 之间')
    }
    if (!comment || String(comment).trim().length < 5) {
      throw new HttpError(400, '评阅意见至少 5 个字')
    }

    const review = await prisma.blindReview.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, '盲审任务不存在')
    if (review.reviewerId !== req.user.id) throw new HttpError(403, '只能提交自己的盲审任务')
    if (review.status === 'SUBMITTED') throw new HttpError(409, '该盲审任务已提交')

    const updated = await prisma.blindReview.update({
      where: { id: review.id },
      data: {
        score: Number(value.toFixed(1)),
        comment: String(comment).trim(),
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    await writeLog(prisma, {
      userId: req.user.id,
      action: 'SUBMIT_BLIND_REVIEW',
      targetType: 'PROJECT',
      targetId: review.projectId,
    })

    res.json(updated)
  }),
)

// 撤销盲审任务
router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const review = await prisma.blindReview.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, '盲审任务不存在')

    await prisma.blindReview.delete({ where: { id: review.id } })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'DELETE_BLIND_REVIEW',
      targetType: 'PROJECT',
      targetId: review.projectId,
    })

    res.json({ message: '已撤销' })
  }),
)

// 盲审统计
router.get(
  '/stats',
  requireRole('ADMIN'),
  asyncHandler(async (_req, res) => {
    const reviews = await prisma.blindReview.findMany({
      select: { status: true, score: true },
    })
    const submitted = reviews.filter((item) => item.status === 'SUBMITTED')
    const average = submitted.length
      ? Number((submitted.reduce((sum, item) => sum + item.score, 0) / submitted.length).toFixed(1))
      : null

    res.json({
      total: reviews.length,
      submitted: submitted.length,
      pending: reviews.length - submitted.length,
      average,
    })
  }),
)

export default router
