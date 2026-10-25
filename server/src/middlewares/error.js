// ── 统一错误处理 ──
import { HttpError } from '../utils/httpError.js'

export function notFound(req, res) {
  res.status(404).json({ message: `接口不存在：${req.method} ${req.originalUrl}` })
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: '请求体不是合法的 JSON' })
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: '请求体过大' })
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: '文件过大，单个文件不能超过 10MB' })
  }
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: '上传字段不正确，请使用 file 字段' })
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ message: '数据已存在，请勿重复提交' })
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: '目标数据不存在' })
  }
  console.error('[server error]', err)
  return res.status(500).json({ message: '服务器内部错误' })
}
