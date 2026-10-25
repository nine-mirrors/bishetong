// ── 站内通知 + 邮件 ──
import { prisma } from '../lib/prisma.js'
import { isMailEnabled, sendMail } from './mail.service.js'

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function deliverMail({ userId, title, content }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (!user?.email) return

    await sendMail({
      to: user.email,
      subject: `【毕设通】${title}`,
      text: `${user.name}，你好：\n\n${content}\n\n—— 毕设通`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.8;color:#14211d">
        <p>${escapeHtml(user.name)}，你好：</p>
        <p>${escapeHtml(content)}</p>
        <p style="color:#6b7a73;font-size:12px">—— 毕设通 · 毕业设计全流程管理</p>
      </div>`,
    })
  } catch (error) {
    console.warn('[mail] 通知邮件失败：', error.message)
  }
}

export function notify(db, { userId, type, title, content }) {
  return db.notification.create({ data: { userId, type, title, content } }).then((notification) => {
    if (isMailEnabled()) void deliverMail({ userId, title, content })
    return notification
  })
}

export function writeLog(db, { userId, action, targetType, targetId }) {
  return db.activityLog.create({ data: { userId, action, targetType, targetId } })
}
