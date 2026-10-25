// ── 站内通知 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = getPagination(req.query)
    const { status = '' } = req.query
    const where = {
      userId: req.user.id,
      ...(status === 'UNREAD' ? { isRead: false } : {}),
    }

    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ])

    res.json({ list, total, unreadCount, page, pageSize })
  }),
)

router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    })
    res.json({ updated: result.count })
  }),
)

router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification || notification.userId !== req.user.id) {
      throw new HttpError(404, '通知不存在')
    }
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    })
    res.json(updated)
  }),
)

export default router
