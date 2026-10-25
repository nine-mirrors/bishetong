// ── 轻量内存限流：用于登录、注册与 AI 接口 ──
import { HttpError } from '../utils/httpError.js'

/**
 * @param {Object} options
 * @param {number} [options.windowMs] 时间窗口，默认 60 秒
 * @param {number} [options.max] 窗口内最大请求数
 * @param {string} [options.keyPrefix] 计数键前缀
 * @param {string} [options.message] 超限提示
 */
export function rateLimit({
  windowMs = 60_000,
  max = 20,
  keyPrefix = 'default',
  message = '请求过于频繁，请稍后再试',
} = {}) {
  const hits = new Map()

  return (req, res, next) => {
    const now = Date.now()

    // 防止 Map 无限增长：超过阈值时清理过期键
    if (hits.size > 5000) {
      for (const [key, item] of hits) {
        if (now > item.resetAt) hits.delete(key)
      }
    }

    const key = `${keyPrefix}:${req.user?.id || req.ip || 'anonymous'}`
    let entry = hits.get(key)

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }

    entry.count += 1
    const remaining = Math.max(0, max - entry.count)
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return next(new HttpError(429, message))
    }

    return next()
  }
}
