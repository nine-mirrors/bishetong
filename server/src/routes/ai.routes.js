// ── AI 辅助接口：评语草稿 / 指导反馈 / 合规建议 ──
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { HttpError } from '../utils/httpError.js'
import { computeCompliance } from '../services/compliance.service.js'
import { aiStatus, chat } from '../services/ai.service.js'

const router = Router()

router.use(authenticate)

const SYSTEM_PROMPT =
  '你是高校毕业设计管理系统的教学助手，使用简体中文，语气务实、具体，不使用空泛套话，不编造未提供的事实。'

router.get('/status', (_req, res) => {
  res.json(aiStatus())
})

const ROLE_LABEL = { STUDENT: '学生', ADVISOR: '导师', ADMIN: '教务' }

const CHAT_SYSTEM = `你是“毕设通”毕业设计全流程管理系统的内置助手。
已知规则：
- 流程：选题申请 → 审核立项 → 任务书 → 指导记录 → 开题/中期里程碑 → 合规检查 → 评阅答辩成绩 → 发布 → 电子签章 → 归档 → 优秀论文。
- 盲审：成绩发布后教务随机抽取，生成匿名编号，自动分配给非本人导师；评阅教师看不到学生与导师信息。
- 优秀论文：成绩已发布、总评 ≥85、查重率 ≤30%、合规分 ≥80。
- 合规检查：任务书 20、指导记录 ≥6 次 20、开题 20、中期 20、论文文档 15、查重 ≤30% 5。
- 查重：查重率由导师录入成绩时人工填写，系统不调用外部查重接口。
- 归档：成绩发布且学生、导师、教务完成手写签名后，由教务归档并生成 SHA-256 摘要，同时向 RFC 3161 时间戳服务申请可信时间戳。校验入口在项目详情“签章归档”页的“校验完整性”，可下载 .tsr 与 HTML 归档件。
- 文档：PDF / DOCX / MD / TXT 上传后自动解析正文与字数，可用于合规检查与全文预览。
要求：使用简体中文，回答简洁、分点，不超过 200 字；只描述上述规则中已有的功能和入口，不要虚构上传、审批或页面步骤；不要编造具体项目数据，需要数据时引导用户去对应页面查看；不要给出成绩或评审结论。`

// AI 对话（所有已登录角色）
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { messages, context = '' } = req.body || {}
    if (!Array.isArray(messages)) throw new HttpError(400, '消息格式不正确')

    const cleaned = messages
      .slice(-10)
      .map((item) => ({
        role: item?.role === 'assistant' ? 'assistant' : 'user',
        content: String(item?.content || '').trim().slice(0, 1500),
      }))
      .filter((item) => item.content)
    if (cleaned.length === 0) throw new HttpError(400, '请输入问题')

    const system = `${CHAT_SYSTEM}
当前用户角色：${ROLE_LABEL[req.user.role] || '用户'}。当前页面：${String(context).slice(0, 80) || '未知'}。`

    const result = await chat({
      messages: [{ role: 'system', content: system }, ...cleaned],
      maxTokens: 800,
      temperature: 0.4,
    })
    res.json(result)
  }),
)

router.post(
  '/assist',
  requireRole('ADVISOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { type, projectId, recordId, provider } = req.body || {}
    if (!['guidance_feedback', 'award_remark', 'compliance_advice'].includes(type)) {
      throw new HttpError(400, '不支持的 AI 辅助类型')
    }
    if (!projectId) throw new HttpError(400, '缺少项目 ID')

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        student: { select: { name: true } },
        advisor: { select: { id: true, name: true } },
        grade: true,
        taskBook: true,
        milestones: true,
        guidanceRecords: { orderBy: { weekNo: 'desc' } },
        documents: true,
      },
    })
    if (!project) throw new HttpError(404, '项目不存在')
    if (req.user.role !== 'ADMIN' && project.advisorId !== req.user.id) {
      throw new HttpError(403, '只能对自己指导的项目使用 AI 辅助')
    }

    let messages

    if (type === 'guidance_feedback') {
      const record = project.guidanceRecords.find((item) => item.id === recordId)
      if (!record) throw new HttpError(404, '指导记录不存在')
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `项目：${project.title}
学生第 ${record.weekNo} 周进展：
${String(record.content).slice(0, 800)}

请写一段导师反馈，80—120 字，包含：对进展的肯定、1—2 条具体可执行的改进建议、下周关注点。直接输出反馈正文，不要标题或解释。`,
        },
      ]
    } else if (type === 'award_remark') {
      const compliance = computeCompliance(project)
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `项目：${project.title}
学生：${project.student?.name || '—'}，导师：${project.advisor?.name || '—'}
总评：${project.grade?.finalScore ?? '—'}（${project.grade?.level || '—'}），查重率：${project.grade?.plagiarismRate ?? '—'}%，合规分：${compliance.score}/100。

请写一段 60—100 字的优秀论文评语，突出选题、工作量、工程实现或规范性中的具体亮点，避免空泛。直接输出评语正文。`,
        },
      ]
    } else {
      const compliance = computeCompliance(project)
      const failed = compliance.factors.filter((item) => !item.passed)
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `项目：${project.title}
合规得分：${compliance.score}/100。
未通过项：
${failed.length ? failed.map((item) => `- ${item.label}：${item.advice}`).join('\n') : '- 无，全部通过'}

请给出 3 条按优先级排序的改进建议，总量不超过 120 字，面向学生，直接输出建议正文。`,
        },
      ]
    }

    const result = await chat({ messages, provider, maxTokens: 600 })
    res.json({ type, ...result })
  }),
)

export default router
