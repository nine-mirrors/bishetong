// ── 鉴权与角色校验 ──
import { prisma } from '../lib/prisma.js'
import { verifyToken } from '../utils/jwt.js'
import { HttpError } from '../utils/httpError.js'

/**
 * 解析 Bearer Token 并查库校验账号状态与最新角色。
 * 不复用 token 里的 role：教务停用账号或调整角色后立即生效，
 * 不会出现“旧 token 还能用 7 天”的情况。
 */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next(new HttpError(401, '请先登录'))

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    return next(new HttpError(401, '登录已失效，请重新登录'))
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    })
    if (!user) return next(new HttpError(401, '账号不存在，请重新登录'))
    if (!user.isActive) return next(new HttpError(403, '账号已被停用，请联系教务'))

    req.user = { id: user.id, role: user.role }
    return next()
  } catch (error) {
    return next(error)
  }
}

/** 限定角色访问，如 requireRole('ADVISOR', 'ADMIN') */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, '请先登录'))
    if (!roles.includes(req.user.role)) return next(new HttpError(403, '无权访问该资源'))
    return next()
  }
}
