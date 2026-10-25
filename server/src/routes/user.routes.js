// ── 用户管理（教务） ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'
import { hashPassword } from '../utils/password.js'
import { toPublicUser } from '../utils/publicUser.js'
import { writeLog } from '../services/notification.service.js'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

const ROLES = ['STUDENT', 'ADVISOR', 'ADMIN']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { keyword = '', role = '', status = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)

    const where = {
      ...(role ? { role } : {}),
      ...(status === 'ACTIVE' ? { isActive: true } : {}),
      ...(status === 'DISABLED' ? { isActive: false } : {}),
      ...(keyword
        ? {
          OR: [
            { name: { contains: keyword } },
            { email: { contains: keyword } },
            { studentNo: { contains: keyword } },
          ],
        }
        : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ])

    res.json({ list: rows.map(toPublicUser), total, page, pageSize })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, password, role = 'STUDENT', studentNo, department } = req.body || {}
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!name || !email || !password) throw new HttpError(400, '姓名、邮箱、密码不能为空')
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, '邮箱格式不正确')
    if (String(password).length < 6) throw new HttpError(400, '密码长度至少 6 位')
    if (!ROLES.includes(role)) throw new HttpError(400, '非法的角色')

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) throw new HttpError(409, '该邮箱已存在')

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email,
        passwordHash: await hashPassword(password),
        role,
        studentNo: studentNo || null,
        department: department || null,
      },
    })

    await writeLog(prisma, {
      userId: req.user.id,
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: user.id,
    })

    res.status(201).json(toPublicUser(user))
  }),
)

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { isActive } = req.body || {}
    if (typeof isActive !== 'boolean') throw new HttpError(400, 'isActive 必须为布尔值')
    if (req.params.id === req.user.id) throw new HttpError(409, '不能停用当前登录账号')

    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) throw new HttpError(404, '用户不存在')

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive },
    })

    await writeLog(prisma, {
      userId: req.user.id,
      action: isActive ? 'ENABLE_USER' : 'DISABLE_USER',
      targetType: 'USER',
      targetId: user.id,
    })

    res.json(toPublicUser(updated))
  }),
)

router.patch(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const { password } = req.body || {}
    if (!password || String(password).length < 6) throw new HttpError(400, '新密码至少 6 位')

    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) throw new HttpError(404, '用户不存在')

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    })

    await writeLog(prisma, {
      userId: req.user.id,
      action: 'RESET_PASSWORD',
      targetType: 'USER',
      targetId: user.id,
    })

    res.json({ message: '密码已重置' })
  }),
)

export default router
