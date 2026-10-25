// ── 数据导出（CSV） ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { computeRisk } from '../services/risk.service.js'
import { toCsv } from '../utils/csv.js'

const router = Router()

router.use(authenticate, requireRole('ADVISOR', 'ADMIN'))

const PHASE_LABELS = {
  TOPIC: '选题',
  PROPOSAL: '开题',
  MIDTERM: '中期',
  DEFENSE: '答辩',
  ARCHIVED: '已归档',
}

const PROJECT_STATUS_LABELS = { ACTIVE: '进行中', COMPLETED: '已完成' }
const APPLICATION_STATUS_LABELS = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }

function sendCsv(res, filename, content) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  )
  res.send(content)
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

router.get(
  '/projects.csv',
  asyncHandler(async (req, res) => {
    const where = req.user.role === 'ADVISOR' ? { advisorId: req.user.id } : {}

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, studentNo: true } },
        advisor: { select: { name: true } },
        milestones: true,
      },
    })

    const rows = projects.map((project) => {
      const risk = computeRisk(project)
      return [
        project.title,
        project.student.name,
        project.student.studentNo || '',
        project.advisor.name,
        PHASE_LABELS[project.currentPhase],
        PROJECT_STATUS_LABELS[project.status],
        risk.summary.approved,
        risk.summary.total,
        risk.score,
        risk.levelLabel,
        project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : '',
      ]
    })

    const csv = toCsv(
      ['项目名称', '学生', '学号', '导师', '阶段', '状态', '已通过里程碑', '里程碑总数', '风险分', '风险等级', '立项时间'],
      rows,
    )
    sendCsv(res, `projects-${stamp()}.csv`, csv)
  }),
)

router.get(
  '/applications.csv',
  asyncHandler(async (req, res) => {
    const where =
      req.user.role === 'ADVISOR' ? { topic: { advisorId: req.user.id } } : {}

    const applications = await prisma.topicApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, studentNo: true } },
        topic: { include: { advisor: { select: { name: true } } } },
        reviewedBy: { select: { name: true } },
      },
    })

    const rows = applications.map((item) => [
      item.student.name,
      item.student.studentNo || '',
      item.topic.title,
      item.topic.advisor.name,
      item.statement,
      APPLICATION_STATUS_LABELS[item.status],
      item.reviewedBy?.name || '',
      item.reviewComment || '',
      new Date(item.createdAt).toLocaleString('zh-CN'),
    ])

    const csv = toCsv(
      ['学生', '学号', '课题', '导师', '申请理由', '状态', '审核人', '审核意见', '提交时间'],
      rows,
    )
    sendCsv(res, `applications-${stamp()}.csv`, csv)
  }),
)

router.get(
  '/grades.csv',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN') throw new HttpError(403, '仅教务可导出成绩')

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { name: true, studentNo: true } },
        advisor: { select: { name: true } },
        grade: true,
      },
    })

    const rows = projects
      .filter((project) => project.grade)
      .map((project) => {
        const grade = project.grade
        return [
          project.student.name,
          project.student.studentNo || '',
          project.title,
          project.advisor.name,
          grade.plagiarismRate ?? '',
          grade.advisorScore ?? '',
          grade.reviewerScore ?? '',
          grade.defenseScore ?? '',
          grade.finalScore ?? '',
          grade.level || '',
          grade.status === 'PUBLISHED' ? '已发布' : '未发布',
          grade.defenseGroup || '',
          grade.defenseLocation || '',
          grade.defenseAt ? new Date(grade.defenseAt).toLocaleString('zh-CN') : '',
        ]
      })

    const csv = toCsv(
      ['学生', '学号', '项目', '导师', '查重率(%)', '导师评分', '评阅评分', '答辩评分', '总评', '等级', '状态', '答辩组', '答辩地点', '答辩时间'],
      rows,
    )
    sendCsv(res, `grades-${stamp()}.csv`, csv)
  }),
)

export default router