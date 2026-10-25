// ── 文件上传配置与内容校验 ──
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HttpError } from '../utils/httpError.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const UPLOAD_DIR = path.resolve(currentDir, '../../uploads')

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.md',
  '.txt',
  '.zip',
  '.xlsx',
  '.pptx',
])

export const MAX_FILE_SIZE = 10 * 1024 * 1024

/** 扩展名 → 期望的真实文件类型 */
const EXTENSION_KINDS = {
  '.pdf': 'pdf',
  '.doc': 'ole',
  '.docx': 'zip',
  '.xlsx': 'zip',
  '.pptx': 'zip',
  '.zip': 'zip',
  '.md': 'text',
  '.txt': 'text',
}

const KIND_LABELS = {
  pdf: 'PDF',
  zip: 'ZIP / Office 压缩格式',
  ole: 'Word 97-2003',
  text: '纯文本',
  unknown: '未知二进制',
}

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * 修正 multipart 文件名的编码：busboy 默认按 latin1 解析，
 * 中文文件名会变成乱码，这里还原为 UTF-8。
 */
export function normalizeFileName(name = '') {
  if (!name) return ''
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

/** 按文件头魔数识别真实类型，不信任客户端声明的后缀 */
function detectKind(buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'pdf'
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'zip'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return 'ole'
  }
  // 纯文本判定：不含 NUL 字节即可（兼容 UTF-8 / GBK 两种中文编码）
  if (!buffer.includes(0x00)) return 'text'
  return 'unknown'
}

/**
 * 校验上传文件内容与后缀是否一致，防止把脚本 / 可执行文件改后缀上传。
 * @param {Buffer} buffer
 * @param {string} originalname
 */
export function assertFileSignature(buffer, originalname) {
  if (!buffer?.length) throw new HttpError(400, '上传文件为空')

  const ext = path.extname(originalname || '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new HttpError(400, `不支持的文件类型：${ext || '未知'}`)
  }

  const expected = EXTENSION_KINDS[ext]
  const actual = detectKind(buffer)
  if (actual !== expected) {
    throw new HttpError(
      400,
      `文件内容与扩展名不符（${ext} 实际为${KIND_LABELS[actual] || '未知类型'}），已拒绝上传`,
    )
  }
}
