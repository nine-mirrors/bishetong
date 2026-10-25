// ── 审计日志（教务） ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { getPagination } from '../utils/pagination.js'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { action = '', targetType = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)

    const where = {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
    }

    const [list, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.activityLog.count({ where }),
    ])

    res.json({ list, total, page, pageSize })
  }),
)

export default router
