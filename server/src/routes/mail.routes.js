// ── 邮件配置状态与测试 ──
import { Router } from 'express'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { isMailEnabled, resolveMailRecipient, sendMail } from '../services/mail.service.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get(
  '/status',
  authenticate,
  requireRole('ADMIN'),
  (_req, res) => {
    res.json({ enabled: isMailEnabled() })
  },
)

router.post(
  '/test',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    if (!isMailEnabled()) {
      res.status(409).json({ message: '尚未配置 SMTP，请填写 server/.env 中的 SMTP_* 变量' })
      return
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const recipient = resolveMailRecipient(user.email)
    const sent = await sendMail({
      to: user.email,
      subject: '【毕设通】邮件配置测试',
      text: '如果你收到这封邮件，说明 SMTP 配置已生效。',
      html: '<p>如果你收到这封邮件，说明 SMTP 配置已生效。</p>',
    })
    if (!sent) {
      res.status(500).json({ message: '发送失败，请检查 SMTP 配置或服务商限制' })
      return
    }
    res.json({ message: `测试邮件已发送至 ${recipient}` })
  }),
)

export default router
