// ── 演示数据自检：表计数 + 种子文档文件是否齐全 ──
// 用法：npm run db:check
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../uploads')

const models = {
  User: 'user',
  Topic: 'topic',
  TopicApplication: 'topicApplication',
  Project: 'project',
  Milestone: 'milestone',
  Document: 'document',
  Notification: 'notification',
  ActivityLog: 'activityLog',
  TaskBook: 'taskBook',
  GuidanceRecord: 'guidanceRecord',
  Grade: 'grade',
  Signature: 'signature',
  Archive: 'archive',
  BlindReview: 'blindReview',
  ExcellentAward: 'excellentAward',
}

const counts = {}
const emptyTables = []
for (const [label, key] of Object.entries(models)) {
  const count = await prisma[key].count()
  counts[label] = count
  if (count === 0) emptyTables.push(label)
}

const documents = await prisma.document.findMany({
  select: { fileName: true, filePath: true },
})
const missingFiles = documents.filter((item) => {
  if (!item.filePath?.startsWith('/uploads/')) return false
  return !fs.existsSync(path.join(uploadDir, item.filePath.replace(/^\/uploads\//, '')))
})

console.log('表计数：')
for (const [label, count] of Object.entries(counts)) {
  console.log(`  ${label.padEnd(16)} ${count}`)
}

if (emptyTables.length) {
  console.log(`\n空表（${emptyTables.length}）：${emptyTables.join('、')}`)
} else {
  console.log('\n所有数据表均有记录')
}

if (missingFiles.length) {
  console.log(`\n种子文档缺失（${missingFiles.length}）：`)
  for (const item of missingFiles) console.log(`  ${item.fileName} -> ${item.filePath}`)
} else {
  console.log(`文档文件齐全（${documents.length} 条记录）`)
}

const ok = emptyTables.length === 0 && missingFiles.length === 0
console.log(ok ? '\n✓ 演示数据自检通过' : '\n✗ 演示数据不完整，请执行 npm run db:seed')
process.exitCode = ok ? 0 : 1

await prisma.$disconnect()
