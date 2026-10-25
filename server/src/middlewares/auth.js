// ── 鉴权与角色校验 ──
import { verifyToken } from '../utils/jwt.js'
import { HttpError } from '../utils/httpError.js'

/** 解析 Bearer Token，把 { id, role } 挂到 req.user */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next(new HttpError(401, '请先登录'))

  try {
    const payload = verifyToken(token)
    req.user = { id: payload.sub, role: payload.role }
    return next()
  } catch {
    return next(new HttpError(401, '登录已失效，请重新登录'))
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
