// ── Express 应用装配 ──
import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/error.js'
import { securityHeaders } from './middlewares/security.js'
import { rateLimit } from './middlewares/rateLimit.js'
import authRoutes from './routes/auth.routes.js'
import topicRoutes from './routes/topic.routes.js'
import applicationRoutes from './routes/application.routes.js'
import projectRoutes from './routes/project.routes.js'
import milestoneRoutes from './routes/milestone.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import statsRoutes from './routes/stats.routes.js'
import userRoutes from './routes/user.routes.js'
import logRoutes from './routes/log.routes.js'
import exportRoutes from './routes/export.routes.js'
import searchRoutes from './routes/search.routes.js'
import mailRoutes from './routes/mail.routes.js'
import blindReviewRoutes from './routes/blindReview.routes.js'
import excellentRoutes from './routes/excellent.routes.js'
import aiRoutes from './routes/ai.routes.js'

const app = express()

app.disable('x-powered-by')
if (env.isProduction) app.set('trust proxy', 1)

app.use(securityHeaders)
app.use(cors({ origin: env.corsOrigin }))
app.use(express.json({ limit: '1mb' }))

// 登录、注册与 AI 调用限流（内存计数，单实例生效）
const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyPrefix: 'login',
  message: '登录尝试过于频繁，请稍后再试',
})
const registerLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyPrefix: 'register',
  message: '注册过于频繁，请稍后再试',
})
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyPrefix: 'ai',
  message: 'AI 调用过于频繁，请稍后再试',
})

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api/ai/chat', aiLimiter)
app.use('/api/ai/assist', aiLimiter)

// 上传文件不开放静态访问，必须经 /api/projects/:id/documents/:docId/download
// 或盲审专用下载接口做鉴权与归属校验后再由服务端转发。

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/topics', topicRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/milestones', milestoneRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/users', userRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/mail', mailRoutes)
app.use('/api/blind-reviews', blindReviewRoutes)
app.use('/api/excellent', excellentRoutes)
app.use('/api/ai', aiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
