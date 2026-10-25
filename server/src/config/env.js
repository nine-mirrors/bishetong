// ── 环境变量加载与校验 ──
import 'dotenv/config'

const required = ['DATABASE_URL', 'JWT_SECRET']
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`缺少环境变量 ${key}，请参照 server/.env.example 创建 server/.env`)
  }
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: (() => {
    const raw = process.env.CORS_ORIGIN || 'http://localhost:5173'
    if (raw.trim() === '*') return '*'
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  })(),
  isProduction: process.env.NODE_ENV === 'production',
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    overrideTo: process.env.MAIL_OVERRIDE_TO || '',
  },
  tsa: {
    url: process.env.TSA_URL || 'http://timestamp.digicert.com',
  },
  storage: {
    region: process.env.OSS_REGION || '',
    bucket: process.env.OSS_BUCKET || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    endpoint: process.env.OSS_ENDPOINT || '',
    prefix: process.env.OSS_PREFIX || 'bishe',
  },
  ai: {
    provider: process.env.AI_PROVIDER || '',
    qwen: {
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.QWEN_API_KEY || '',
      model: process.env.QWEN_MODEL || 'qwen-plus',
    },
    deepseek: {
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
  },
}
