// ── 认证：注册 / 登录 / 当前用户 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { signToken } from '../utils/jwt.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { toPublicUser } from '../utils/publicUser.js'

const router = Router()
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, password, studentNo, department } = req.body || {}
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    if (!name || !email || !password) throw new HttpError(400, '姓名、邮箱、密码不能为空')
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, '邮箱格式不正确')
    if (String(password).length < 6) throw new HttpError(400, '密码长度至少 6 位')

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) throw new HttpError(409, '该邮箱已注册')

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email,
        passwordHash: await hashPassword(password),
        studentNo: studentNo || null,
        department: department || null,
        role: 'STUDENT',
      },
    })

    res.status(201).json({
      token: signToken({ sub: user.id, role: user.role, ver: user.tokenVersion }),
      user: toPublicUser(user),
    })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { password } = req.body || {}
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    if (!email || !password) throw new HttpError(400, '邮箱和密码不能为空')

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new HttpError(401, '邮箱或密码错误')

    const matched = await comparePassword(password, user.passwordHash)
    if (!matched) throw new HttpError(401, '邮箱或密码错误')
    if (!user.isActive) throw new HttpError(403, '账号已被停用，请联系教务')

    res.json({
      token: signToken({ sub: user.id, role: user.role, ver: user.tokenVersion }),
      user: toPublicUser(user),
    })
  }),
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new HttpError(401, '用户不存在')
    res.json(toPublicUser(user))
  }),
)

// 修改自己的密码
router.put(
  '/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body || {}
    if (!oldPassword || !newPassword) throw new HttpError(400, '原密码和新密码不能为空')
    if (String(newPassword).length < 6) throw new HttpError(400, '新密码至少 6 位')

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new HttpError(401, '用户不存在')

    const matched = await comparePassword(oldPassword, user.passwordHash)
    if (!matched) throw new HttpError(400, '原密码不正确')

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    })

    res.json({ message: '密码已修改，请重新登录' })
  }),
)

export default router
