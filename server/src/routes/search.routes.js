// ── 全局搜索 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const keyword = String(req.query.q || '').trim().slice(0, 50)
    if (!keyword) {
      return res.json({ topics: [], projects: [], users: [] })
    }

    const topicWhere =
      req.user.role === 'STUDENT'
        ? { status: 'OPEN', title: { contains: keyword } }
        : req.user.role === 'ADVISOR'
          ? { advisorId: req.user.id, title: { contains: keyword } }
          : { title: { contains: keyword } }

    const projectWhere =
      req.user.role === 'STUDENT'
        ? { studentId: req.user.id, title: { contains: keyword } }
        : req.user.role === 'ADVISOR'
          ? { advisorId: req.user.id, title: { contains: keyword } }
          : { title: { contains: keyword } }

    const [topics, projects, users] = await Promise.all([
      prisma.topic.findMany({
        where: topicWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true },
      }),
      prisma.project.findMany({
        where: projectWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          currentPhase: true,
          student: { select: { name: true } },
        },
      }),
      req.user.role === 'ADMIN'
        ? prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: keyword } },
              { email: { contains: keyword } },
              { studentNo: { contains: keyword } },
            ],
          },
          take: 5,
          select: { id: true, name: true, email: true, role: true },
        })
        : Promise.resolve([]),
    ])

    return res.json({ topics, projects, users })
  }),
)

export default router
