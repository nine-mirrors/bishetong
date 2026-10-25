// ── 文档解析：PDF / DOCX / Markdown / TXT 提取文本，供合规检查与预览 ──
import path from 'node:path'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { prisma } from '../lib/prisma.js'
import { readUpload } from './storage.service.js'

const SUPPORTED = new Set(['.pdf', '.docx', '.md', '.txt'])
const MAX_TEXT_LENGTH = 200000

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractText({ fileName, filePath }) {
  const ext = path.extname(fileName || '').toLowerCase()
  if (!SUPPORTED.has(ext)) {
    return { supported: false, text: '' }
  }

  const buffer = await readUpload(filePath)
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return { supported: true, text: normalizeText(result.text) }
    } finally {
      await parser.destroy()
    }
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer })
    return { supported: true, text: normalizeText(result.value) }
  }
  return { supported: true, text: normalizeText(buffer.toString('utf8')) }
}

export async function parseDocument(document) {
  try {
    const result = await extractText(document)
    if (!result.supported) {
      return prisma.document.update({
        where: { id: document.id },
        data: { parseStatus: 'UNSUPPORTED', parsedAt: new Date() },
      })
    }
    const fullText = result.text
    const wordCount = fullText.replace(/\s/g, '').length
    return prisma.document.update({
      where: { id: document.id },
      data: {
        textContent: fullText.slice(0, MAX_TEXT_LENGTH),
        wordCount,
        parseStatus: 'PARSED',
        parsedAt: new Date(),
      },
    })
  } catch (error) {
    console.warn('[document] 解析失败：', document.fileName, error.message)
    return prisma.document.update({
      where: { id: document.id },
      data: { parseStatus: 'FAILED', parsedAt: new Date() },
    })
  }
}
