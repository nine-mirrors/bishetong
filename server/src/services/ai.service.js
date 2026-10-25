// ── AI 辅助：千问 / DeepSeek（OpenAI 兼容接口，可选） ──
import { env } from '../config/env.js'
import { HttpError } from '../utils/httpError.js'

const PROVIDERS = {
  qwen: {
    label: '通义千问',
    baseUrl: env.ai.qwen.baseUrl,
    apiKey: env.ai.qwen.apiKey,
    model: env.ai.qwen.model,
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: env.ai.deepseek.baseUrl,
    apiKey: env.ai.deepseek.apiKey,
    model: env.ai.deepseek.model,
  },
}

function resolveDefaultKey() {
  if (env.ai.provider && PROVIDERS[env.ai.provider]?.apiKey) return env.ai.provider
  const found = Object.keys(PROVIDERS).find((key) => PROVIDERS[key].apiKey)
  return found || ''
}

export function aiStatus() {
  const providers = Object.entries(PROVIDERS).map(([key, item]) => ({
    key,
    label: item.label,
    model: item.model,
    enabled: Boolean(item.apiKey),
  }))
  return {
    enabled: providers.some((item) => item.enabled),
    defaultProvider: resolveDefaultKey() || null,
    providers,
  }
}

async function requestCompletion(key, config, { messages, temperature, maxTokens }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  let response
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    throw new HttpError(
      502,
      error.name === 'AbortError' ? `${config.label}响应超时` : `${config.label}连接失败`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.warn('[ai] 调用失败：', key, response.status, detail.slice(0, 200))
    throw new HttpError(502, `${config.label}调用失败（${response.status}）`)
  }

  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new HttpError(502, `${config.label}未返回有效内容`)

  return { content, provider: key, model: config.model }
}

export async function chat({ messages, provider, temperature = 0.5, maxTokens = 700 }) {
  const configured = Object.keys(PROVIDERS).filter((key) => PROVIDERS[key].apiKey)
  const preferred = provider || resolveDefaultKey()
  const order = preferred && PROVIDERS[preferred]?.apiKey
    ? [preferred, ...configured.filter((key) => key !== preferred)]
    : configured

  if (order.length === 0) {
    throw new HttpError(503, 'AI 服务未配置，请在 server/.env 填写 QWEN_API_KEY 或 DEEPSEEK_API_KEY')
  }

  let lastError = null
  for (const [index, key] of order.entries()) {
    try {
      return await requestCompletion(key, PROVIDERS[key], { messages, temperature, maxTokens })
    } catch (error) {
      lastError = error
      if (index < order.length - 1) {
        console.warn(`[ai] ${PROVIDERS[key].label}不可用，尝试备用模型`)
      }
    }
  }

  throw lastError
}
