// ── 上传内容校验单元测试 ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { assertFileSignature } from '../src/config/upload.js'

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n', 'latin1'), Buffer.from([0x00, 0x01])])
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from([0x00, 0x02])])
const OLE = Buffer.concat([
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  Buffer.from([0x00, 0x03]),
])
const EXE = Buffer.concat([Buffer.from('MZ', 'latin1'), Buffer.from([0x90, 0x00, 0x03])])

test('PDF 文件按魔数校验通过', () => {
  assert.doesNotThrow(() => assertFileSignature(PDF, '毕业论文.pdf'))
})

test('ZIP 系 Office 文件按魔数校验通过', () => {
  for (const name of ['论文.docx', '成绩.xlsx', '答辩.pptx', '源码.zip']) {
    assert.doesNotThrow(() => assertFileSignature(ZIP, name))
  }
})

test('旧版 Word 文档按 OLE 魔数校验通过', () => {
  assert.doesNotThrow(() => assertFileSignature(OLE, '任务书.doc'))
})

test('纯文本按 UTF-8 文本校验通过', () => {
  assert.doesNotThrow(() => assertFileSignature(Buffer.from('# 开题报告\n\n正文', 'utf8'), '开题.md'))
})

test('可执行文件改后缀为 pdf 时被拒绝', () => {
  assert.throws(() => assertFileSignature(EXE, '论文.pdf'), /文件内容与扩展名不符/)
})

test('压缩包改后缀为 md 时被拒绝', () => {
  assert.throws(() => assertFileSignature(ZIP, '说明.md'), /文件内容与扩展名不符/)
})

test('非白名单扩展名与空文件被拒绝', () => {
  assert.throws(() => assertFileSignature(EXE, 'payload.exe'), /不支持的文件类型/)
  assert.throws(() => assertFileSignature(Buffer.alloc(0), '论文.pdf'), /上传文件为空/)
})
