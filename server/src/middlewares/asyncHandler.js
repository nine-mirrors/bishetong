// ── 异步路由包装：统一把 Promise 异常交给错误中间件 ──
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
