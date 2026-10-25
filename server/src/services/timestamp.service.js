// ── 可信时间戳：RFC 3161 TSA（归档时申请，独立于 CA 签章） ──
import * as asn1js from 'asn1js'
import { createHash } from 'node:crypto'
import { env } from '../config/env.js'

const SHA256_OID = '2.16.840.1.101.3.4.2.1'

function buildRequest(digest) {
  const request = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 1 }),
      new asn1js.Sequence({
        value: [
          new asn1js.Sequence({
            value: [
              new asn1js.ObjectIdentifier({ value: SHA256_OID }),
              new asn1js.Null(),
            ],
          }),
          new asn1js.OctetString({ valueHex: digest }),
        ],
      }),
      new asn1js.Integer({ value: Date.now() }),
      new asn1js.Boolean({ value: true }),
    ],
  })
  return Buffer.from(request.toBER(false))
}

function parseResponse(buffer) {
  const parsed = asn1js.fromBER(buffer)
  if (parsed.offset === -1) throw new Error('时间戳响应解析失败')
  const root = parsed.result
  if (!root?.valueBlock?.value || root.valueBlock.value.length < 2) {
    throw new Error('时间戳响应缺少令牌')
  }

  const statusInfo = root.valueBlock.value[0]
  const statusCode = statusInfo?.valueBlock?.value?.[0]?.valueBlock?.valueDec
  if (statusCode !== 0 && statusCode !== 1) {
    throw new Error(`时间戳服务拒绝请求（status=${statusCode}）`)
  }

  const token = root.valueBlock.value[1]
  const signedData = token?.valueBlock?.value?.[1]?.valueBlock?.value?.[0]
  const encapContent = signedData?.valueBlock?.value?.[2]
  const eContent = encapContent?.valueBlock?.value?.[1]?.valueBlock?.value?.[0]
  const tstBytes = eContent?.valueBlock?.valueHexView
  if (!tstBytes) throw new Error('时间戳令牌缺少 TSTInfo')

  const tst = asn1js.fromBER(Buffer.from(tstBytes)).result
  const imprint = Buffer.from(
    tst?.valueBlock?.value?.[2]?.valueBlock?.value?.[1]?.valueBlock?.valueHexView || [],
  )
  const genTimeNode = tst?.valueBlock?.value?.[4]
  const timestampedAt = genTimeNode?.toDate?.() || new Date()

  return { statusCode, imprint, timestampedAt }
}

export function timestampDigest(content) {
  return createHash('sha256').update(content).digest('hex')
}

export async function createTimestamp(content) {
  const digest = createHash('sha256').update(String(content), 'utf8').digest()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  let response
  try {
    response = await fetch(env.tsa.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: buildRequest(digest),
      signal: controller.signal,
    })
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? '时间戳服务响应超时' : '时间戳服务连接失败')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) throw new Error(`时间戳服务返回 ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const parsed = parseResponse(buffer)
  if (!parsed.imprint.equals(digest)) throw new Error('时间戳摘要与归档件不一致')

  return {
    token: buffer.toString('base64'),
    digest: digest.toString('hex'),
    timestampedAt: parsed.timestampedAt,
    tsaUrl: env.tsa.url,
  }
}

export function inspectTimestamp(tokenBase64, content) {
  const buffer = Buffer.from(String(tokenBase64 || ''), 'base64')
  const parsed = parseResponse(buffer)
  const digest = createHash('sha256').update(String(content), 'utf8').digest()
  return {
    valid: parsed.imprint.equals(digest),
    timestampedAt: parsed.timestampedAt,
    tsaUrl: env.tsa.url,
    digest: digest.toString('hex'),
  }
}
