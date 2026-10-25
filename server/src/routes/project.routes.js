// ── 毕业设计项目：列表 / 详情 / 阶段推进 / 文档 ──
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { getPagination } from '../utils/pagination.js'
import { PHASE_ORDER } from '../services/project.service.js'
import { computeRisk } from '../services/risk.service.js'
import { computeCompliance } from '../services/compliance.service.js'
import { buildArchiveHtml } from '../services/archive.service.js'
import { notify, writeLog } from '../services/notification.service.js'
import { saveUpload, sendUpload } from '../services/storage.service.js'
import { parseDocument } from '../services/document.service.js'
import { createTimestamp, inspectTimestamp } from '../services/timestamp.service.js'
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  assertFileSignature,
  normalizeFileName,
} from '../config/upload.js'

const router = Router()

router.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new HttpError(400, `不支持的文件类型：${ext || '未知'}`))
    }
    return cb(null, true)
  },
})

/** 当前用户是否可访问该项目 */
function assertProjectAccess(user, project) {
  const allowed =
    user.role === 'ADMIN' ||
    project.studentId === user.id ||
    project.advisorId === user.id
  if (!allowed) throw new HttpError(403, '无权访问该项目')
}

/** 成绩权重与等级 */
const GRADE_WEIGHTS = { advisor: 0.3, reviewer: 0.3, defense: 0.4 }

function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex')
}

function gradeLevel(score) {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '中等'
  if (score >= 60) return '及格'
  return '不及格'
}

function parseScore(value, label) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (Number.isNaN(number) || number < 0 || number > 100) {
    throw new HttpError(400, `${label}需在 0—100 之间`)
  }
  return Number(number.toFixed(1))
}

async function loadProjectOrThrow(id) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new HttpError(404, '项目不存在')
  return project
}

const projectInclude = {
  topic: { select: { id: true, title: true, description: true } },
  student: { select: { id: true, name: true, studentNo: true, department: true } },
  advisor: { select: { id: true, name: true, department: true } },
  milestones: { orderBy: { dueDate: 'asc' } },
  documents: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      version: true,
      createdAt: true,
      parseStatus: true,
      wordCount: true,
      parsedAt: true,
    },
  },
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { phase = '', status = '', keyword = '' } = req.query
    const { page, pageSize, skip, take } = getPagination(req.query)

    const scope =
      req.user.role === 'STUDENT'
        ? { studentId: req.user.id }
        : req.user.role === 'ADVISOR'
          ? { advisorId: req.user.id }
          : {}

    const keywordFilter = keyword
      ? {
        OR: [
          { title: { contains: keyword } },
          { student: { name: { contains: keyword } } },
        ],
      }
      : {}

    const where = {
      ...scope,
      ...keywordFilter,
      ...(phase ? { currentPhase: phase } : {}),
      ...(status ? { status } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: projectInclude,
      }),
      prisma.project.count({ where }),
    ])

    const list = rows.map((project) => ({ ...project, risk: computeRisk(project) }))
    res.json({ list, total, page, pageSize })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectInclude,
    })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    res.json({ ...project, risk: computeRisk(project) })
  }),
)

// 导师 / 教务推进项目阶段（只能逐级推进，不能跳跃）
router.patch(
  '/:id/phase',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { phase } = req.body || {}
    if (!PHASE_ORDER.includes(phase)) throw new HttpError(400, '非法的项目阶段')

    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    const currentIndex = PHASE_ORDER.indexOf(project.currentPhase)
    const nextIndex = PHASE_ORDER.indexOf(phase)
    if (nextIndex !== currentIndex + 1) {
      throw new HttpError(409, `阶段只能依次推进，当前为 ${project.currentPhase}`)
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        currentPhase: phase,
        ...(phase === 'ARCHIVED' ? { status: 'COMPLETED' } : {}),
      },
    })

    res.json(updated)
  }),
)

// 批量催办：向选中项目的学生发送提醒通知
router.post(
  '/remind',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { projectIds } = req.body || {}
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      throw new HttpError(400, '请选择需要催办的项目')
    }
    if (projectIds.length > 50) throw new HttpError(400, '单次最多催办 50 个项目')

    const scope = req.user.role === 'ADVISOR' ? { advisorId: req.user.id } : {}
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds }, ...scope },
      select: { id: true, title: true, studentId: true },
    })
    if (projects.length === 0) throw new HttpError(404, '未找到可催办的项目')

    for (const project of projects) {
      await notify(prisma, {
        userId: project.studentId,
        type: 'REMINDER',
        title: '进度催办提醒',
        content: `导师提醒你关注《${project.title}》的里程碑进度，请及时提交材料或更新状态。`,
      })
      await writeLog(prisma, {
        userId: req.user.id,
        action: 'REMIND_PROJECT',
        targetType: 'PROJECT',
        targetId: project.id,
      })
    }

    res.json({ sent: projects.length })
  }),
)

// 上传文档（学生/导师/教务均可，自动累加版本号）
router.post(
  '/:id/documents',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)
    if (!req.file) throw new HttpError(400, '请选择要上传的文件')

    const { milestoneId = '' } = req.body || {}
    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
      if (!milestone || milestone.projectId !== project.id) {
        throw new HttpError(400, '里程碑不属于该项目')
      }
    }

    const fileName = normalizeFileName(req.file.originalname)
    assertFileSignature(req.file.buffer, fileName)

    const latest = await prisma.document.aggregate({
      where: { projectId: project.id, fileName },
      _max: { version: true },
    })

    const stored = await saveUpload({ ...req.file, originalname: fileName })

    const document = await prisma.document.create({
      data: {
        projectId: project.id,
        milestoneId: milestoneId || null,
        fileName,
        filePath: stored.filePath,
        version: (latest._max.version || 0) + 1,
        uploadedById: req.user.id,
      },
    })

    const parsed = await parseDocument(document)
    // 只返回前端需要的字段，避免把服务端存储路径与全文回传给客户端
    res.status(201).json({
      id: parsed.id,
      fileName: parsed.fileName,
      version: parsed.version,
      parseStatus: parsed.parseStatus,
      wordCount: parsed.wordCount,
      parsedAt: parsed.parsedAt,
      createdAt: parsed.createdAt,
    })
  }),
)

router.get(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    const list = await prisma.document.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        milestoneId: true,
        fileName: true,
        version: true,
        uploadedById: true,
        parseStatus: true,
        wordCount: true,
        parsedAt: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    })
    res.json(list)
  }),
)

// 下载文档：必须登录且属于该项目相关人，服务端读取后以附件转发
router.get(
  '/:id/documents/:docId/download',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const document = await prisma.document.findFirst({
      where: { id: req.params.docId, projectId: project.id },
      select: { filePath: true, fileName: true },
    })
    if (!document) throw new HttpError(404, '文档不存在')

    await sendUpload(res, document)
  }),
)

router.get(
  '/:id/documents/:docId/content',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    const document = await prisma.document.findFirst({
      where: { id: req.params.docId, projectId: project.id },
      select: {
        id: true,
        fileName: true,
        wordCount: true,
        parseStatus: true,
        parsedAt: true,
        textContent: true,
      },
    })
    if (!document) throw new HttpError(404, '文档不存在')
    res.json({ ...document, text: document.textContent, textContent: undefined })
  }),
)

router.post(
  '/:id/documents/:docId/parse',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    const document = await prisma.document.findFirst({
      where: { id: req.params.docId, projectId: project.id },
    })
    if (!document) throw new HttpError(404, '文档不存在')

    const parsed = await parseDocument(document)
    res.json({
      id: parsed.id,
      fileName: parsed.fileName,
      wordCount: parsed.wordCount,
      parseStatus: parsed.parseStatus,
      parsedAt: parsed.parsedAt,
    })
  }),
)

// ── 任务书 ──
router.get(
  '/:id/taskbook',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)
    const taskBook = await prisma.taskBook.findUnique({ where: { projectId: project.id } })
    res.json(taskBook)
  }),
)

router.put(
  '/:id/taskbook',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { content, requirements = '' } = req.body || {}
    if (!content || String(content).trim().length < 20) {
      throw new HttpError(400, '任务书内容至少 20 个字')
    }

    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const taskBook = await prisma.taskBook.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        content: String(content).trim(),
        requirements: String(requirements).trim() || null,
        status: 'ISSUED',
        issuedAt: new Date(),
      },
      update: {
        content: String(content).trim(),
        requirements: String(requirements).trim() || null,
        status: 'ISSUED',
        issuedAt: new Date(),
        confirmedAt: null,
      },
    })

    await notify(prisma, {
      userId: project.studentId,
      type: 'SYSTEM',
      title: '导师已下达任务书',
      content: `《${project.title}》的任务书已下达，请查看并确认。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'ISSUE_TASKBOOK',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.json(taskBook)
  }),
)

router.post(
  '/:id/taskbook/confirm',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    if (project.studentId !== req.user.id) throw new HttpError(403, '只能确认自己的任务书')

    const taskBook = await prisma.taskBook.findUnique({ where: { projectId: project.id } })
    if (!taskBook || taskBook.status !== 'ISSUED') {
      throw new HttpError(409, '任务书尚未下达或已确认')
    }

    const updated = await prisma.taskBook.update({
      where: { projectId: project.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })

    await notify(prisma, {
      userId: project.advisorId,
      type: 'SYSTEM',
      title: '学生已确认任务书',
      content: `《${project.title}》的任务书已由学生确认。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'CONFIRM_TASKBOOK',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.json(updated)
  }),
)

// ── 指导记录 ──
router.get(
  '/:id/guidance',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const list = await prisma.guidanceRecord.findMany({
      where: { projectId: project.id },
      orderBy: { weekNo: 'desc' },
      include: { student: { select: { id: true, name: true } } },
    })
    res.json(list)
  }),
)

router.post(
  '/:id/guidance',
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const { weekNo, content } = req.body || {}
    const week = Number(weekNo)
    if (!Number.isInteger(week) || week < 1 || week > 30) {
      throw new HttpError(400, '周次需在 1—30 之间')
    }
    if (!content || String(content).trim().length < 10) {
      throw new HttpError(400, '指导记录内容至少 10 个字')
    }

    const project = await loadProjectOrThrow(req.params.id)
    if (project.studentId !== req.user.id) throw new HttpError(403, '只能提交自己的指导记录')

    const exists = await prisma.guidanceRecord.findUnique({
      where: { projectId_weekNo: { projectId: project.id, weekNo: week } },
    })
    if (exists) throw new HttpError(409, `第 ${week} 周已有指导记录`)

    const record = await prisma.guidanceRecord.create({
      data: {
        projectId: project.id,
        studentId: req.user.id,
        weekNo: week,
        content: String(content).trim(),
      },
    })

    await notify(prisma, {
      userId: project.advisorId,
      type: 'SYSTEM',
      title: '学生提交了指导记录',
      content: `《${project.title}》第 ${week} 周指导记录已提交，请查看并回复。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'SUBMIT_GUIDANCE',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.status(201).json(record)
  }),
)

router.put(
  '/:id/guidance/:recordId/feedback',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { feedback } = req.body || {}
    if (!feedback || String(feedback).trim().length < 5) {
      throw new HttpError(400, '指导反馈至少 5 个字')
    }

    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const record = await prisma.guidanceRecord.findUnique({ where: { id: req.params.recordId } })
    if (!record || record.projectId !== project.id) throw new HttpError(404, '指导记录不存在')

    const updated = await prisma.guidanceRecord.update({
      where: { id: record.id },
      data: { feedback: String(feedback).trim(), feedbackAt: new Date() },
    })

    await notify(prisma, {
      userId: project.studentId,
      type: 'SYSTEM',
      title: '导师回复了指导记录',
      content: `《${project.title}》第 ${record.weekNo} 周指导记录已收到导师反馈。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'REVIEW_GUIDANCE',
      targetType: 'GUIDANCE',
      targetId: record.id,
    })

    res.json(updated)
  }),
)

// ── 评阅 / 答辩 / 成绩 ──
router.get(
  '/:id/grade',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)
    const grade = await prisma.grade.findUnique({ where: { projectId: project.id } })
    // 学生只能看到已发布的成绩
    if (grade && req.user.role === 'STUDENT' && grade.status !== 'PUBLISHED') {
      return res.json(null)
    }
    res.json(grade)
  }),
)

router.put(
  '/:id/grade',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const existing = await prisma.grade.findUnique({ where: { projectId: project.id } })
    if (existing?.status === 'PUBLISHED') {
      throw new HttpError(409, '成绩已发布，不能修改')
    }

    const advisorScore = parseScore(req.body?.advisorScore, '导师评分')
    const reviewerScore = parseScore(req.body?.reviewerScore, '评阅评分')
    const defenseScore = parseScore(req.body?.defenseScore, '答辩评分')
    const plagiarismRate = parseScore(req.body?.plagiarismRate, '查重率')
    if (plagiarismRate !== null && plagiarismRate > 100) {
      throw new HttpError(400, '查重率需在 0—100 之间')
    }

    const complete =
      advisorScore !== null && reviewerScore !== null && defenseScore !== null
    const finalScore = complete
      ? Number(
        (
          advisorScore * GRADE_WEIGHTS.advisor +
          reviewerScore * GRADE_WEIGHTS.reviewer +
          defenseScore * GRADE_WEIGHTS.defense
        ).toFixed(1),
      )
      : null

    const data = {
      advisorScore,
      reviewerScore,
      defenseScore,
      plagiarismRate,
      finalScore,
      level: finalScore === null ? null : gradeLevel(finalScore),
      defenseGroup: req.body?.defenseGroup?.trim() || null,
      defenseLocation: req.body?.defenseLocation?.trim() || null,
      defenseAt: req.body?.defenseAt ? new Date(req.body.defenseAt) : null,
    }

    const grade = await prisma.grade.upsert({
      where: { projectId: project.id },
      create: { projectId: project.id, ...data },
      update: data,
    })

    await writeLog(prisma, {
      userId: req.user.id,
      action: 'SAVE_GRADE',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.json(grade)
  }),
)

router.post(
  '/:id/grade/publish',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    const grade = await prisma.grade.findUnique({ where: { projectId: project.id } })
    if (!grade) throw new HttpError(404, '尚未录入成绩')
    if (grade.finalScore === null) throw new HttpError(409, '三项评分未齐全，不能发布')
    if (grade.status === 'PUBLISHED') throw new HttpError(409, '成绩已发布')

    const updated = await prisma.grade.update({
      where: { projectId: project.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })

    await notify(prisma, {
      userId: project.studentId,
      type: 'SYSTEM',
      title: '毕业设计成绩已发布',
      content: `《${project.title}》总评 ${updated.finalScore} 分（${updated.level}），请查看。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'PUBLISH_GRADE',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.json(updated)
  }),
)

// ── 合规检查 ──
router.get(
  '/:id/compliance',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        taskBook: true,
        guidanceRecords: true,
        milestones: true,
        documents: true,
        grade: true,
      },
    })
    if (!project) throw new HttpError(404, '项目不存在')
    assertProjectAccess(req.user, project)

    res.json(computeCompliance(project))
  }),
)

// ── 电子签章 ──
router.get(
  '/:id/signatures',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const list = await prisma.signature.findMany({
      where: { projectId: project.id },
      orderBy: { signedAt: 'asc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    })
    res.json(list)
  }),
)

router.post(
  '/:id/signatures',
  asyncHandler(async (req, res) => {
    const { imageData } = req.body || {}
    if (!imageData || !String(imageData).startsWith('data:image/png;base64,')) {
      throw new HttpError(400, '签名图片格式不正确')
    }
    if (String(imageData).length > 400000) {
      throw new HttpError(400, '签名图片过大，请重新签署')
    }

    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)
    if (project.currentPhase === 'ARCHIVED') {
      throw new HttpError(409, '项目已归档，不能再修改签名')
    }

    const signature = await prisma.signature.upsert({
      where: { projectId_userId: { projectId: project.id, userId: req.user.id } },
      create: {
        projectId: project.id,
        userId: req.user.id,
        role: req.user.role,
        imageData: String(imageData),
      },
      update: {
        imageData: String(imageData),
        role: req.user.role,
        signedAt: new Date(),
      },
    })

    const counterpart = req.user.role === 'STUDENT' ? project.advisorId : project.studentId
    await notify(prisma, {
      userId: counterpart,
      type: 'SYSTEM',
      title: '项目新增电子签名',
      content: `《${project.title}》已完成一次电子签名，可在“签章归档”中查看。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'SIGN_PROJECT',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.json(signature)
  }),
)

// ── 归档 ──
router.get(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const archive = await prisma.archive.findUnique({ where: { projectId: project.id } })
    if (!archive) {
      res.json(null)
      return
    }
    res.json({
      id: archive.id,
      archivedAt: archive.archivedAt,
      archivedById: archive.archivedById,
      digest: archive.digest,
      algorithm: archive.digest ? 'SHA-256' : null,
      hasTimestamp: Boolean(archive.timestampToken),
      timestampedAt: archive.timestampedAt,
      tsaUrl: archive.tsaUrl,
      timestampDigest: archive.timestampDigest,
    })
  }),
)

// 校验归档件完整性：重新计算摘要并与归档时记录的值比对
router.get(
  '/:id/archive/verify',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const archive = await prisma.archive.findUnique({ where: { projectId: project.id } })
    if (!archive) throw new HttpError(404, '项目尚未归档')
    if (!archive.digest) {
      res.json({ verifiable: false, valid: null, message: '该归档件生成于摘要功能上线前，无法校验' })
      return
    }

    const computed = sha256(archive.html)
    let timestamp = { verifiable: false, valid: null }
    if (archive.timestampToken) {
      try {
        const result = inspectTimestamp(archive.timestampToken, archive.html)
        timestamp = {
          verifiable: true,
          valid: result.valid,
          timestampedAt: result.timestampedAt,
          tsaUrl: result.tsaUrl,
          digest: result.digest,
        }
      } catch (error) {
        timestamp = { verifiable: true, valid: false, message: error.message }
      }
    }
    res.json({
      verifiable: true,
      valid: computed === archive.digest,
      algorithm: 'SHA-256',
      digest: archive.digest,
      computed,
      archivedAt: archive.archivedAt,
      timestamp,
    })
  }),
)

router.post(
  '/:id/archive',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, name: true, studentNo: true, email: true } },
        advisor: { select: { id: true, name: true, email: true } },
        topic: true,
        taskBook: true,
        milestones: { orderBy: { dueDate: 'asc' } },
        guidanceRecords: { orderBy: { weekNo: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
        grade: true,
        signatures: {
          orderBy: { signedAt: 'asc' },
          include: { user: { select: { name: true, role: true } } },
        },
        archive: true,
      },
    })
    if (!project) throw new HttpError(404, '项目不存在')
    if (project.archive) throw new HttpError(409, '项目已归档')

    if (!project.grade || project.grade.status !== 'PUBLISHED') {
      throw new HttpError(409, '成绩尚未发布，不能归档')
    }
    const roles = new Set(project.signatures.map((item) => item.role))
    if (!['STUDENT', 'ADVISOR', 'ADMIN'].every((role) => roles.has(role))) {
      throw new HttpError(409, '需学生、导师与教务完成电子签名后才能归档')
    }

    const html = buildArchiveHtml(project)
    const digest = sha256(html)
    let stamp = null
    try {
      stamp = await createTimestamp(html)
    } catch (error) {
      console.warn('[archive] 时间戳申请失败：', error.message)
    }
    const archive = await prisma.archive.create({
      data: {
        projectId: project.id,
        html,
        digest,
        timestampToken: stamp?.token || null,
        timestampDigest: stamp?.digest || null,
        timestampedAt: stamp?.timestampedAt || null,
        tsaUrl: stamp?.tsaUrl || null,
        archivedById: req.user.id,
      },
    })

    await prisma.project.update({
      where: { id: project.id },
      data: { currentPhase: 'ARCHIVED', status: 'COMPLETED' },
    })

    await notify(prisma, {
      userId: project.studentId,
      type: 'SYSTEM',
      title: '毕业设计已归档',
      content: `《${project.title}》已完成签章归档，可在“签章归档”中下载归档文件。`,
    })
    await notify(prisma, {
      userId: project.advisorId,
      type: 'SYSTEM',
      title: '毕业设计已归档',
      content: `《${project.title}》已完成签章归档。`,
    })
    await writeLog(prisma, {
      userId: req.user.id,
      action: 'ARCHIVE_PROJECT',
      targetType: 'PROJECT',
      targetId: project.id,
    })

    res.status(201).json({
      id: archive.id,
      archivedAt: archive.archivedAt,
      timestamped: Boolean(stamp),
      timestampedAt: archive.timestampedAt,
      tsaUrl: archive.tsaUrl,
    })
  }),
)

router.get(
  '/:id/archive/timestamp',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const archive = await prisma.archive.findUnique({ where: { projectId: project.id } })
    if (!archive?.timestampToken) throw new HttpError(404, '该项目尚未生成可信时间戳')

    res.setHeader('Content-Type', 'application/timestamp-reply')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(`时间戳-${project.title}.tsr`)}`,
    )
    res.send(Buffer.from(archive.timestampToken, 'base64'))
  }),
)

router.get(
  '/:id/archive/download',
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id)
    assertProjectAccess(req.user, project)

    const archive = await prisma.archive.findUnique({ where: { projectId: project.id } })
    if (!archive) throw new HttpError(404, '项目尚未归档')

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(`归档-${project.title}.html`)}`,
    )
    res.send(archive.html)
  }),
)

export default router
