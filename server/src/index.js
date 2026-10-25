// ── 服务入口 ──
import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

const server = app.listen(env.port, () => {
  console.log(`[server] 已启动：http://localhost:${env.port}/api/health`)
})

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[server] 收到 ${signal}，正在关闭...`)

  // 最长等待 10 秒，避免连接残留导致进程无法退出
  const forceTimer = setTimeout(() => {
    console.error('[server] 关闭超时，强制退出')
    process.exit(1)
  }, 10_000)
  forceTimer.unref()

  server.close(async () => {
    try {
      await prisma.$disconnect()
    } finally {
      clearTimeout(forceTimer)
      process.exit(0)
    }
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (reason) => {
  console.error('[server] 未处理的 Promise 拒绝：', reason)
})
