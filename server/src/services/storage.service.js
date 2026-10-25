// ── 文件存储：阿里云 OSS 私有桶（未配置时回退本地磁盘） ──
// 安全约束：
// 1. 不对外暴露 uploads 静态目录，也未使用 OSS 公共读；
// 2. 所有文件读取都必须先经过带鉴权的路由做归属校验；
// 3. 读取后由服务端以 attachment 形式转发，避免链接被直接复用。
import fs from 'node:fs/promises'
import path from 'node:path'
import OSS from 'ali-oss'
import { env } from '../config/env.js'
import { UPLOAD_DIR, ensureUploadDir, normalizeFileName } from '../config/upload.js'
import { HttpError } from '../utils/httpError.js'

const OSS_PREFIX = 'oss:'

let client = null

function isOssEnabled() {
  const { region, bucket, accessKeyId, accessKeySecret } = env.storage
  return Boolean(region && bucket && accessKeyId && accessKeySecret)
}

function getClient() {
  if (!client) {
    const options = {
      region: env.storage.region,
      bucket: env.storage.bucket,
      accessKeyId: env.storage.accessKeyId,
      accessKeySecret: env.storage.accessKeySecret,
    }
    if (env.storage.endpoint) options.endpoint = env.storage.endpoint
    client = new OSS(options)
  }
  return client
}

function buildFileName(originalname) {
  const ext = path.extname(originalname).toLowerCase()
  const base = path
    .basename(originalname, ext)
    .replace(/[^\w\u4e00-\u9fa5-]/g, '_')
    .slice(0, 40)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${base}${ext}`
}

/**
 * 保存上传文件
 * @param {{ buffer: Buffer, originalname: string }} file
 * @returns {Promise<{ filePath: string, storage: 'OSS' | 'LOCAL', key?: string }>}
 */
export async function saveUpload(file) {
  const filename = buildFileName(normalizeFileName(file.originalname))

  if (isOssEnabled()) {
    const key = `${env.storage.prefix.replace(/^\/|\/$/g, '')}/${new Date().getFullYear()}/${filename}`
    try {
      await getClient().put(key, file.buffer)
    } catch (error) {
      console.warn('[oss] 上传失败：', error.message)
      throw new HttpError(502, '对象存储上传失败，请稍后重试')
    }
    // 只保存内部引用，不生成任何公网可直接访问的地址
    return { filePath: `${OSS_PREFIX}${key}`, storage: 'OSS', key }
  }

  ensureUploadDir()
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer)
  return { filePath: `/uploads/${filename}`, storage: 'LOCAL' }
}

function localPath(filePath) {
  const relative = filePath.replace(/^\/uploads\//, '')
  const absolute = path.resolve(UPLOAD_DIR, relative)
  if (absolute !== UPLOAD_DIR && !absolute.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    throw new HttpError(400, '非法的文件路径')
  }
  return absolute
}

function ossKey(filePath) {
  if (filePath.startsWith(OSS_PREFIX)) return filePath.slice(OSS_PREFIX.length)
  // 兼容历史数据中直接落库的 OSS 公网 URL
  const matched = /^https?:\/\/[^/]+\/(.+)$/.exec(filePath)
  return matched ? decodeURIComponent(matched[1]) : null
}

/** 读取上传文件内容（仅服务端内部调用） */
export async function readUpload(filePath) {
  if (!filePath) throw new HttpError(404, '文件不存在')

  if (filePath.startsWith('/uploads/')) {
    try {
      return await fs.readFile(localPath(filePath))
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, '文件不存在')
      throw error
    }
  }

  const key = ossKey(filePath)
  if (!key) throw new HttpError(400, '不支持的文件地址')
  if (!isOssEnabled()) throw new HttpError(503, '对象存储未配置，无法读取该文件')

  try {
    const result = await getClient().get(key)
    return result.content
  } catch (error) {
    console.warn('[oss] 读取失败：', error.message)
    throw new HttpError(404, '文件不存在或已失效')
  }
}

function safeFileName(name, fallback = 'document') {
  const base = path.basename(String(name || '')).replace(/[\r\n"\\]/g, '_')
  return base || fallback
}

/**
 * 以附件形式下发文件，统一禁止浏览器嗅探与内联执行
 * @param {import('express').Response} res
 * @param {{ filePath: string, fileName?: string }} document
 * @param {{ downloadName?: string }} [options]
 */
export async function sendUpload(res, document, options = {}) {
  const buffer = await readUpload(document.filePath)
  const name = safeFileName(options.downloadName || document.fileName)
  const asciiFallback = name.replace(/[^\x20-\x7e]/g, '_')

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  )
  res.send(buffer)
}
