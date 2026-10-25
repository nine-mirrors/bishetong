// ── 邮件发送（SMTP，可选） ──
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter = null

export function isMailEnabled() {
  return Boolean(env.mail.host && env.mail.user && env.mail.pass)
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: { user: env.mail.user, pass: env.mail.pass },
    })
  }
  return transporter
}

export function resolveMailRecipient(to) {
  return env.mail.overrideTo || to
}

export async function sendMail({ to, subject, text, html }) {
  if (!isMailEnabled() || !to) return false
  const recipient = resolveMailRecipient(to)
  try {
    await getTransporter().sendMail({
      from: env.mail.from,
      to: recipient,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    console.warn('[mail] 发送失败：', error.message)
    return false
  }
}
