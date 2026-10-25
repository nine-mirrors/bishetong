// ── 演示种子数据：三角色账号 + 多阶段项目 + 盲审 / 优秀论文 / 签章归档 ──
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { buildArchiveHtml } from '../src/services/archive.service.js'
import { createTimestamp } from '../src/services/timestamp.service.js'

const prisma = new PrismaClient()

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const SEED_UPLOAD_DIR = path.resolve(currentDir, '../uploads/seed')

// 演示用签名图（透明 PNG，墨色手写曲线 + 玉青下划线）
const SIGNATURE_IMAGE =
  'data:image/png;base64,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'

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex')
}

function writeSeedFile(name, content) {
  fs.mkdirSync(SEED_UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(path.join(SEED_UPLOAD_DIR, name), content, 'utf8')
  return `/uploads/seed/${name}`
}

function makeGrade({
  advisorScore,
  reviewerScore,
  defenseScore,
  plagiarismRate,
  group,
  location,
  defenseDays,
  publishedDays,
}) {
  const finalScore = Number(
    (advisorScore * 0.3 + reviewerScore * 0.3 + defenseScore * 0.4).toFixed(1),
  )
  const level =
    finalScore >= 90 ? '优秀' : finalScore >= 80 ? '良好' : finalScore >= 70 ? '中等' : finalScore >= 60 ? '及格' : '不及格'
  return {
    advisorScore,
    reviewerScore,
    defenseScore,
    finalScore,
    level,
    plagiarismRate,
    defenseGroup: group,
    defenseLocation: location,
    defenseAt: daysFromNow(defenseDays),
    status: 'PUBLISHED',
    publishedAt: daysFromNow(publishedDays),
  }
}

async function createDemoProject({
  admin,
  topic,
  student,
  advisor,
  phase = 'TOPIC',
  status = 'ACTIVE',
  startDays = -30,
  defenseDays = null,
  createdAtDays = -30,
  milestones = [],
  taskBook = null,
  guidance = [],
  documents = [],
  grade = null,
  signatures = [],
  blindReview = null,
  award = null,
  archiveAtDays = null,
}) {
  const project = await prisma.project.create({
    data: {
      topicId: topic.id,
      studentId: student.id,
      advisorId: advisor.id,
      title: topic.title,
      currentPhase: phase,
      status,
      startDate: daysFromNow(startDays),
      defenseDate: defenseDays === null ? null : daysFromNow(defenseDays),
      createdAt: daysFromNow(createdAtDays),
      milestones: {
        create: milestones.map((item) => ({
          name: item.name,
          phase: item.phase,
          dueDate: daysFromNow(item.due),
          status: item.status || 'PENDING',
          submittedAt: item.submitted === undefined ? null : daysFromNow(item.submitted),
          submittedById: item.submitted === undefined ? null : student.id,
          reviewedById: item.reviewed === undefined ? null : advisor.id,
          reviewComment: item.comment || null,
          createdAt: daysFromNow(item.due - 30),
        })),
      },
    },
    include: { milestones: true },
  })

  if (taskBook) {
    await prisma.taskBook.create({
      data: {
        projectId: project.id,
        content: taskBook.content,
        requirements: taskBook.requirements,
        status: taskBook.status,
        issuedAt: taskBook.issuedDays === undefined ? null : daysFromNow(taskBook.issuedDays),
        confirmedAt:
          taskBook.confirmedDays === undefined ? null : daysFromNow(taskBook.confirmedDays),
        createdAt: daysFromNow(createdAtDays),
      },
    })
  }

  if (guidance.length) {
    await prisma.guidanceRecord.createMany({
      data: guidance.map((item) => ({
        projectId: project.id,
        studentId: student.id,
        weekNo: item.weekNo,
        content: item.content,
        feedback: item.feedback || null,
        feedbackAt: item.feedbackDays === undefined ? null : daysFromNow(item.feedbackDays),
        createdAt: daysFromNow(item.createdDays),
      })),
    })
  }

  if (documents.length) {
    await prisma.document.createMany({
      data: documents.map((item) => ({
        projectId: project.id,
        fileName: item.fileName,
        filePath: item.filePath,
        version: item.version || 1,
        uploadedById: student.id,
        createdAt: daysFromNow(item.createdDays),
      })),
    })
  }

  if (grade) {
    await prisma.grade.create({ data: { projectId: project.id, ...grade } })
  }

  if (signatures.length) {
    await prisma.signature.createMany({
      data: signatures.map((item) => ({
        projectId: project.id,
        userId: item.user.id,
        role: item.role,
        imageData: SIGNATURE_IMAGE,
        signedAt: daysFromNow(item.days),
      })),
    })
  }

  if (blindReview) {
    await prisma.blindReview.create({
      data: {
        projectId: project.id,
        reviewerId: blindReview.reviewer.id,
        anonymousCode: blindReview.code,
        score: blindReview.score ?? null,
        comment: blindReview.comment || null,
        status: blindReview.status || 'ASSIGNED',
        assignedAt: daysFromNow(blindReview.assignedDays),
        submittedAt:
          blindReview.submittedDays === undefined ? null : daysFromNow(blindReview.submittedDays),
      },
    })
  }

  if (award) {
    await prisma.excellentAward.create({
      data: {
        projectId: project.id,
        level: award.level,
        remark: award.remark,
        awardedById: admin.id,
        awardedAt: daysFromNow(award.awardedDays),
      },
    })
  }

  if (archiveAtDays !== null) {
    const full = await prisma.project.findUnique({
      where: { id: project.id },
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
      },
    })
    const html = buildArchiveHtml(full)
    let stamp = null
    try {
      stamp = await createTimestamp(html)
    } catch (error) {
      console.warn('[seed] 时间戳申请失败：', error.message)
    }
    await prisma.archive.create({
      data: {
        projectId: project.id,
        html,
        digest: sha256(html),
        timestampToken: stamp?.token || null,
        timestampDigest: stamp?.digest || null,
        timestampedAt: stamp?.timestampedAt || null,
        tsaUrl: stamp?.tsaUrl || null,
        archivedById: admin.id,
        archivedAt: daysFromNow(archiveAtDays),
      },
    })
  }

  return project
}

async function main() {
  console.log('[seed] 清空旧数据 ...')
  await prisma.activityLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.guidanceRecord.deleteMany()
  await prisma.taskBook.deleteMany()
  await prisma.grade.deleteMany()
  await prisma.signature.deleteMany()
  await prisma.archive.deleteMany()
  await prisma.blindReview.deleteMany()
  await prisma.excellentAward.deleteMany()
  await prisma.project.deleteMany()
  await prisma.topicApplication.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('123456', 10)

  const admin = await prisma.user.create({
    data: {
      name: '教务管理员',
      email: 'admin@demo.edu',
      passwordHash,
      role: 'ADMIN',
      department: '教务处',
    },
  })

  const advisor = await prisma.user.create({
    data: {
      name: '张明',
      email: 'advisor@demo.edu',
      passwordHash,
      role: 'ADVISOR',
      department: '计算机学院',
    },
  })

  const advisor2 = await prisma.user.create({
    data: {
      name: '李静',
      email: 'advisor2@demo.edu',
      passwordHash,
      role: 'ADVISOR',
      department: '软件学院',
    },
  })

  const advisor3 = await prisma.user.create({
    data: {
      name: '王海',
      email: 'advisor3@demo.edu',
      passwordHash,
      role: 'ADVISOR',
      department: '人工智能学院',
    },
  })

  const student = await prisma.user.create({
    data: {
      name: '王小明',
      email: 'student@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010101',
      department: '计算机学院',
    },
  })

  const student2 = await prisma.user.create({
    data: {
      name: '陈雨',
      email: 'student2@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010102',
      department: '计算机学院',
    },
  })

  const student3 = await prisma.user.create({
    data: {
      name: '林浩然',
      email: 'student3@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010103',
      department: '软件学院',
    },
  })

  const student4 = await prisma.user.create({
    data: {
      name: '赵一鸣',
      email: 'student4@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010104',
      department: '人工智能学院',
    },
  })

  const student5 = await prisma.user.create({
    data: {
      name: '周思远',
      email: 'student5@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010105',
      department: '计算机学院',
    },
  })

  const student6 = await prisma.user.create({
    data: {
      name: '苏念',
      email: 'student6@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010106',
      department: '软件学院',
    },
  })

  const student7 = await prisma.user.create({
    data: {
      name: '顾言',
      email: 'student7@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010107',
      department: '软件学院',
    },
  })

  const student8 = await prisma.user.create({
    data: {
      name: '沈知',
      email: 'student8@demo.edu',
      passwordHash,
      role: 'STUDENT',
      studentNo: '2021010108',
      department: '计算机学院',
    },
  })

  const topic1 = await prisma.topic.create({
    data: {
      title: '基于 Vue 与 Node 的毕业设计过程管理系统',
      description:
        '面向本科毕业设计场景，打通选题、开题、中期、答辩与归档，提供三角色协作、风险预警与质量抽检。',
      capacity: 1,
      status: 'CLOSED',
      advisorId: advisor.id,
      createdAt: daysFromNow(-150),
    },
  })

  const topic2 = await prisma.topic.create({
    data: {
      title: '校园实验室设备预约与冲突检测',
      description:
        '设计实验室设备预约模型，实现时间冲突检测、库存预警、使用统计与预约信用分。',
      capacity: 2,
      status: 'OPEN',
      advisorId: advisor.id,
      createdAt: daysFromNow(-120),
    },
  })

  const topic3 = await prisma.topic.create({
    data: {
      title: '基于大模型的课程作业自动批注系统',
      description:
        '结合提示词工程与规则引擎，对课程作业给出结构化反馈，并支持教师二次修订。',
      capacity: 1,
      status: 'CLOSED',
      advisorId: advisor.id,
      createdAt: daysFromNow(-110),
    },
  })

  const topic4 = await prisma.topic.create({
    data: {
      title: '面向校园的失物招领智能匹配平台',
      description:
        '利用文本与图像特征匹配失物与招领信息，提供可信发布、认领核验与消息提醒。',
      capacity: 1,
      status: 'CLOSED',
      advisorId: advisor2.id,
      createdAt: daysFromNow(-240),
    },
  })

  const topic5 = await prisma.topic.create({
    data: {
      title: '基于知识图谱的课程学习路径推荐',
      description:
        '构建课程知识点图谱，结合先修关系与学生画像生成个性化学习路径。',
      capacity: 2,
      status: 'OPEN',
      advisorId: advisor2.id,
      createdAt: daysFromNow(-60),
    },
  })

  const topic6 = await prisma.topic.create({
    data: {
      title: '面向实验室的轻量级设备故障预测系统',
      description:
        '采集设备运行日志，使用时序特征与规则模型预测故障风险，输出可解释的维护建议。',
      capacity: 2,
      status: 'OPEN',
      advisorId: advisor3.id,
      createdAt: daysFromNow(-90),
    },
  })

  const topic7 = await prisma.topic.create({
    data: {
      title: '基于多模态检索的校园二手交易平台',
      description:
        '支持图片与文本混合检索，提供商品可信度评分、交易纠纷留痕与校园身份认证。',
      capacity: 1,
      status: 'OPEN',
      advisorId: advisor3.id,
      createdAt: daysFromNow(-45),
    },
  })

  const topic8 = await prisma.topic.create({
    data: {
      title: '毕业设计文档智能合规检查工具',
      description:
        '对任务书、开题、中期与论文文档做结构与规范检查，输出可定位的修改建议。',
      capacity: 1,
      status: 'CLOSED',
      advisorId: advisor2.id,
      createdAt: daysFromNow(-180),
    },
  })

  await prisma.topicApplication.createMany({
    data: [
      {
        topicId: topic1.id,
        studentId: student.id,
        statement:
          '做过 Vue 与 Node 项目，希望把毕业设计管理中的真实协作问题做成完整系统，并重点研究进度风险模型。',
        status: 'APPROVED',
        reviewedById: advisor.id,
        reviewComment: '基础扎实，选题与专业方向匹配，同意开题。',
        createdAt: daysFromNow(-140),
        updatedAt: daysFromNow(-138),
      },
      {
        topicId: topic2.id,
        studentId: student2.id,
        statement:
          '在实验室做过设备管理助理，了解预约冲突和台账混乱的问题，希望做出能直接试用的系统。',
        status: 'APPROVED',
        reviewedById: advisor.id,
        reviewComment: '有真实场景观察，同意立项，先完成预约冲突模型。',
        createdAt: daysFromNow(-35),
        updatedAt: daysFromNow(-33),
      },
      {
        topicId: topic2.id,
        studentId: student3.id,
        statement: '希望做设备预约方向，但对冲突检测算法还不熟悉，想尝试实现。',
        status: 'REJECTED',
        reviewedById: advisor.id,
        reviewComment: '方向更匹配大模型批注课题，建议申请第 3 题。',
        createdAt: daysFromNow(-36),
        updatedAt: daysFromNow(-34),
      },
      {
        topicId: topic3.id,
        studentId: student3.id,
        statement:
          '做过提示词实验和课程助教，希望研究如何让大模型批注结果稳定、可解释，并支持教师修订。',
        status: 'APPROVED',
        reviewedById: advisor.id,
        reviewComment: '动机明确，先做小规模作业样本评测。',
        createdAt: daysFromNow(-8),
        updatedAt: daysFromNow(-6),
      },
      {
        topicId: topic4.id,
        studentId: student4.id,
        statement:
          '关注校园失物招领的低匹配效率，计划用文本与图像特征做混合检索，并加入认领核验。',
        status: 'APPROVED',
        reviewedById: advisor2.id,
        reviewComment: '选题完整，注意隐私与信息审核。',
        createdAt: daysFromNow(-235),
        updatedAt: daysFromNow(-233),
      },
      {
        topicId: topic6.id,
        studentId: student5.id,
        statement:
          '在实验室维护过设备日志，希望用时序特征做轻量故障预测，并把维护建议做成可解释的。',
        status: 'APPROVED',
        reviewedById: advisor3.id,
        reviewComment: '数据基础较好，同意立项，先完成日志清洗。',
        createdAt: daysFromNow(-80),
        updatedAt: daysFromNow(-78),
      },
      {
        topicId: topic8.id,
        studentId: student6.id,
        statement:
          '做过文档规范检查脚本，希望把规则引擎与可定位建议结合起来，减少人工形式审查。',
        status: 'APPROVED',
        reviewedById: advisor2.id,
        reviewComment: '目标清晰，注意规则可配置。',
        createdAt: daysFromNow(-175),
        updatedAt: daysFromNow(-173),
      },
      {
        topicId: topic5.id,
        studentId: student7.id,
        statement:
          '对知识图谱和推荐系统都很感兴趣，已完成先修关系调研，希望做可解释的学习路径推荐。',
        status: 'PENDING',
        createdAt: daysFromNow(-1),
        updatedAt: daysFromNow(-1),
      },
      {
        topicId: topic2.id,
        studentId: student8.id,
        statement:
          '做过实验室值班与设备借还登记，希望把预约冲突和台账问题一起解决，愿意参与试点。',
        status: 'PENDING',
        createdAt: daysFromNow(-2),
        updatedAt: daysFromNow(-2),
      },
    ],
  })

  const thesisProcess = writeSeedFile(
    'seed-thesis-process.md',
    `# 基于 Vue 与 Node 的毕业设计过程管理系统

## 摘要
针对毕业设计过程中信息分散、节点不清、批阅滞后的问题，设计并实现一套覆盖选题、开题、中期、答辩与归档的全流程管理系统。系统采用 Vue 3 与 Express 构建，使用 MySQL 持久化数据，通过角色权限矩阵与状态机约束关键操作。

## 关键词
毕业设计；过程管理；风险预警；Vue；Node.js

## 第一章 绪论
### 1.1 研究背景
毕业设计管理长期依赖微信群、Excel 与邮件，材料版本与批阅记录难以追溯。

### 1.2 研究目标
建立学生、导师、教务三方协同的统一工作台，并将进度风险转化为可解释的指标。

## 第二章 需求分析
### 2.1 角色与用例
学生提交材料与指导记录；导师批阅里程碑与任务书；教务负责质量抽检、优秀论文与归档。

### 2.2 非功能需求
权限隔离、操作留痕、文件版本可追溯、归档件可校验。

## 第三章 系统设计
### 3.1 架构设计
前端采用 Vue 3 + Pinia，后端采用 Express + Prisma，文件存储支持本地与 OSS 双模式。

### 3.2 数据模型
核心实体包括用户、课题、申请、项目、里程碑、文档、成绩、签名与归档。

## 第四章 关键实现
### 4.1 状态机与权限
项目阶段按 TOPIC → PROPOSAL → MIDTERM → DEFENSE → ARCHIVED 逐级推进。

### 4.2 风险评分
综合逾期、完成度、批阅等待与截止时间四个因子输出风险分与建议。

## 第五章 测试与总结
完成单元测试、接口联调与页面回归，系统可支撑完整毕业设计流程。
`,
  )

  const proposalLab = writeSeedFile(
    'seed-proposal-lab.md',
    `# 开题报告：校园实验室设备预约与冲突检测

## 一、选题背景
实验室设备预约依赖线下登记，容易出现时间冲突、设备闲置与台账不一致。

## 二、研究内容
1. 预约时间段建模与冲突检测；
2. 设备库存与使用状态联动；
3. 预约信用分与违约记录；
4. 使用统计与可视化。

## 三、技术路线
采用 Vue 3 + Express + MySQL，冲突检测使用区间重叠算法，统计部分使用聚合查询。

## 四、进度安排
第 1—4 周完成需求与模型；第 5—8 周完成核心功能；第 9—12 周联调与测试。
`,
  )

  const midtermLab = writeSeedFile(
    'seed-midterm-lab.md',
    `# 中期检查报告：校园实验室设备预约与冲突检测

## 已完成
- 完成预约数据模型与冲突检测接口；
- 完成设备台账与预约日历页面；
- 完成基础权限与操作日志。

## 存在问题
- 高峰时段冲突提示不够直观；
- 违约信用分规则仍需与实验室老师确认。

## 下一步
补充冲突可视化、信用分规则与统计报表，并完成压力测试。
`,
  )

  const thesisLost = writeSeedFile(
    'seed-thesis-lost.md',
    `# 面向校园的失物招领智能匹配平台

## 摘要
针对校园失物招领信息分散、匹配效率低的问题，构建支持文本与图像混合检索的失物招领平台，并提供认领核验与可信发布机制。

## 关键词
失物招领；多模态检索；可信发布；校园服务

## 第一章 绪论
校园失物信息通常散落在群聊与公告栏，失主与拾取者之间缺少稳定的匹配渠道。

## 第二章 系统设计
系统包含信息发布、混合检索、认领核验、消息提醒与信誉记录五个模块。

## 第三章 关键实现
使用文本向量与图像特征进行召回，再通过规则过滤与人工核验降低误领风险。

## 第四章 测试与总结
完成检索准确率测试与并发上传测试，系统在校园场景下具备可用性。
`,
  )

  const designLost = writeSeedFile(
    'seed-design-lost.md',
    `# 失物招领平台设计说明书

## 1. 总体设计
前端采用 Vue 3，后端采用 Express，检索服务独立为可替换模块。

## 2. 模块划分
- 信息发布：图片上传、描述结构化、审核状态；
- 混合检索：文本召回 + 图像特征召回；
- 认领核验：问题校验、人工复核、领取留痕；
- 信誉记录：虚假信息与恶意认领记录。

## 3. 数据设计
核心表包括物品、特征向量、认领申请与核验记录。
`,
  )

  const thesisCompliance = writeSeedFile(
    'seed-thesis-compliance.md',
    `# 毕业设计文档智能合规检查工具

## 摘要
面向毕业设计文档的形式审查，构建可配置的规则引擎，对任务书、开题、中期与论文进行结构与规范检查，并输出可定位的修改建议。

## 关键词
合规检查；规则引擎；文档结构；毕业设计

## 第一章 绪论
人工形式审查耗时且标准不一致，需要将规范转化为可执行规则。

## 第二章 规则设计
规则分为结构完整性、章节顺序、字数与格式、引用规范四类，每条规则包含定位信息与修复建议。

## 第三章 实现
使用文档解析与规则匹配生成问题清单，前端按章节定位展示。

## 第四章 测试
在 30 份历史文档上验证，规则命中率与人工复核结果一致。
`,
  )

  const thesisProcessFinal = writeSeedFile(
    'seed-thesis-process-final.md',
    `${fs.readFileSync(path.join(SEED_UPLOAD_DIR, 'seed-thesis-process.md'), 'utf8')}

## 附录
系统源码、测试报告与部署说明见项目仓库。`,
  )

  const projectA = await createDemoProject({
    admin,
    topic: topic1,
    student,
    advisor,
    phase: 'DEFENSE',
    status: 'ACTIVE',
    startDays: -120,
    defenseDays: 8,
    createdAtDays: -120,
    milestones: [
      {
        name: '开题报告提交',
        phase: 'PROPOSAL',
        due: -80,
        status: 'APPROVED',
        submitted: -92,
        comment: '开题思路清晰，技术路线可行，同意进入下一阶段。',
      },
      {
        name: '中期检查材料',
        phase: 'MIDTERM',
        due: -40,
        status: 'APPROVED',
        submitted: -48,
        comment: '核心模块已完成，建议补充风险模型实验数据。',
      },
      {
        name: '答辩材料提交',
        phase: 'DEFENSE',
        due: -5,
        status: 'APPROVED',
        submitted: -10,
        comment: '材料齐全，答辩准备充分。',
      },
    ],
    taskBook: {
      content:
        '围绕毕业设计全流程管理开展研究与实现，完成需求分析、系统设计、前后端开发、测试与部署，形成可运行的 Web 系统与设计文档。',
      requirements:
        '1. 每周提交一次指导记录；\n2. 开题前完成文献综述；\n3. 论文正文不少于 1.2 万字；\n4. 系统需完成真实数据库与权限控制。',
      status: 'CONFIRMED',
      issuedDays: -118,
      confirmedDays: -116,
    },
    guidance: [
      {
        weekNo: 1,
        content: '完成需求访谈与竞品调研，整理出课题、申请、里程碑三类核心对象。',
        feedback: '需求范围基本合理，注意补充权限矩阵。',
        feedbackDays: -110,
        createdDays: -112,
      },
      {
        weekNo: 2,
        content: '完成数据库设计与接口清单，确定三角色权限边界。',
        feedback: '表结构可以，建议为申请增加唯一约束。',
        feedbackDays: -103,
        createdDays: -105,
      },
      {
        weekNo: 3,
        content: '完成登录鉴权与课题模块，联调通过。',
        feedback: '继续推进里程碑与通知，注意错误态处理。',
        feedbackDays: -96,
        createdDays: -98,
      },
      {
        weekNo: 4,
        content: '完成申请审核与自动立项，补充默认里程碑生成逻辑。',
        feedback: '自动立项的事务边界处理得不错，继续完善阶段校验。',
        feedbackDays: -89,
        createdDays: -91,
      },
      {
        weekNo: 5,
        content: '完成文档上传与版本号累加，开始风险评分模型设计。',
        feedback: '风险因子要有解释，避免只给一个分数。',
        feedbackDays: -82,
        createdDays: -84,
      },
      {
        weekNo: 6,
        content: '完成风险评分与数据看板，准备答辩材料。',
        createdDays: -75,
      },
    ],
    documents: [
      {
        fileName: '毕业设计论文（终稿）.md',
        filePath: thesisProcessFinal,
        version: 3,
        createdDays: -12,
      },
      {
        fileName: '中期检查报告.md',
        filePath: midtermLab,
        version: 2,
        createdDays: -42,
      },
    ],
    grade: makeGrade({
      advisorScore: 90,
      reviewerScore: 88,
      defenseScore: 86,
      plagiarismRate: 12.5,
      group: '计算机学院第 2 组',
      location: '实训楼 A305',
      defenseDays: 8,
      publishedDays: -2,
    }),
    signatures: [
      { user: student, role: 'STUDENT', days: -3 },
      { user: advisor, role: 'ADVISOR', days: -2 },
    ],
    blindReview: {
      reviewer: advisor2,
      code: 'BR-2026-001',
      status: 'ASSIGNED',
      assignedDays: -1,
    },
  })

  const projectB = await createDemoProject({
    admin,
    topic: topic2,
    student: student2,
    advisor,
    phase: 'PROPOSAL',
    status: 'ACTIVE',
    startDays: -25,
    createdAtDays: -25,
    milestones: [
      {
        name: '开题报告提交',
        phase: 'PROPOSAL',
        due: 5,
        status: 'SUBMITTED',
        submitted: -1,
      },
      { name: '中期检查材料', phase: 'MIDTERM', due: 45 },
      { name: '答辩材料提交', phase: 'DEFENSE', due: 80 },
    ],
    taskBook: {
      content:
        '围绕校园实验室设备预约与冲突检测开展研究，完成预约模型、冲突检测、设备台账与统计功能。',
      requirements:
        '1. 完成冲突检测算法与单元测试；\n2. 每周提交指导记录；\n3. 在中后期完成实验室试点；\n4. 论文不少于 1 万字。',
      status: 'CONFIRMED',
      issuedDays: -23,
      confirmedDays: -22,
    },
    guidance: [
      {
        weekNo: 1,
        content: '完成实验室访谈与预约流程梳理，确定设备、时段、预约三类对象。',
        feedback: '先把冲突场景列全，再设计表结构。',
        feedbackDays: -18,
        createdDays: -20,
      },
      {
        weekNo: 2,
        content: '完成预约表与设备表设计，画出冲突检测流程图。',
        feedback: '注意跨天预约与设备维护时段的处理。',
        feedbackDays: -11,
        createdDays: -13,
      },
      {
        weekNo: 3,
        content: '完成开题报告初稿，整理了 6 篇相关文献。',
        createdDays: -6,
      },
    ],
    documents: [
      {
        fileName: '开题报告.md',
        filePath: proposalLab,
        version: 1,
        createdDays: -2,
      },
      {
        fileName: '中期检查材料.md',
        filePath: midtermLab,
        version: 1,
        createdDays: -1,
      },
    ],
  })

  const projectC = await createDemoProject({
    admin,
    topic: topic3,
    student: student3,
    advisor,
    phase: 'TOPIC',
    status: 'ACTIVE',
    startDays: -4,
    createdAtDays: -4,
    milestones: [
      { name: '开题报告提交', phase: 'PROPOSAL', due: 26 },
      { name: '中期检查材料', phase: 'MIDTERM', due: 56 },
      { name: '答辩材料提交', phase: 'DEFENSE', due: 86 },
    ],
    taskBook: {
      content:
        '研究提示词工程与规则引擎结合，对课程作业给出结构化反馈，并支持教师二次修订。',
      requirements:
        '1. 完成作业样本集与评测指标；\n2. 每周提交指导记录；\n3. 输出可解释的批注理由；\n4. 论文不少于 1 万字。',
      status: 'ISSUED',
      issuedDays: -3,
    },
    guidance: [
      {
        weekNo: 1,
        content: '完成课程作业样本收集，确定批注维度与教师修订流程。',
        createdDays: -1,
      },
    ],
  })

  const projectD = await createDemoProject({
    admin,
    topic: topic4,
    student: student4,
    advisor: advisor2,
    phase: 'ARCHIVED',
    status: 'COMPLETED',
    startDays: -260,
    defenseDays: -40,
    createdAtDays: -260,
    milestones: [
      {
        name: '开题报告提交',
        phase: 'PROPOSAL',
        due: -220,
        status: 'APPROVED',
        submitted: -228,
        comment: '选题贴近校园场景，同意开题。',
      },
      {
        name: '中期检查材料',
        phase: 'MIDTERM',
        due: -170,
        status: 'APPROVED',
        submitted: -178,
        comment: '检索模块完成度较高，注意隐私与审核。',
      },
      {
        name: '答辩材料提交',
        phase: 'DEFENSE',
        due: -80,
        status: 'APPROVED',
        submitted: -86,
        comment: '材料规范，答辩准备充分。',
      },
    ],
    taskBook: {
      content:
        '围绕校园失物招领场景，完成多模态检索、认领核验与可信发布机制的研究与实现。',
      requirements:
        '1. 完成文本与图像混合检索；\n2. 每周提交指导记录；\n3. 完成 30 组匹配测试；\n4. 论文不少于 1.2 万字。',
      status: 'CONFIRMED',
      issuedDays: -258,
      confirmedDays: -256,
    },
    guidance: Array.from({ length: 6 }, (_, index) => ({
      weekNo: index + 1,
      content: [
        '完成失物招领场景调研，整理出发布、检索、认领三类流程。',
        '完成数据模型与检索模块接口设计。',
        '完成文本检索与图像特征召回的原型。',
        '完成认领核验流程与信誉记录。',
        '完成匹配测试与误领风险分析。',
        '完成论文初稿与答辩材料。',
      ][index],
      feedback: [
        '场景调研扎实，继续细化审核规则。',
        '接口边界清楚，注意特征更新策略。',
        '召回效果不错，补一组对比实验。',
        '核验流程要留痕，避免恶意认领。',
        '测试样本要覆盖极端情况。',
        '材料完整，可以准备答辩。',
      ][index],
      feedbackDays: -230 + index * 30,
      createdDays: -235 + index * 30,
    })),
    documents: [
      {
        fileName: '毕业设计论文（终稿）.md',
        filePath: thesisLost,
        version: 2,
        createdDays: -90,
      },
      {
        fileName: '设计说明书.md',
        filePath: designLost,
        version: 1,
        createdDays: -95,
      },
    ],
    grade: makeGrade({
      advisorScore: 93,
      reviewerScore: 91,
      defenseScore: 93,
      plagiarismRate: 6.8,
      group: '软件学院第 1 组',
      location: '博学楼 B201',
      defenseDays: -40,
      publishedDays: -60,
    }),
    signatures: [
      { user: student4, role: 'STUDENT', days: -70 },
      { user: advisor2, role: 'ADVISOR', days: -68 },
      { user: admin, role: 'ADMIN', days: -66 },
    ],
    blindReview: {
      reviewer: advisor3,
      code: 'BR-2026-003',
      status: 'SUBMITTED',
      score: 90.5,
      comment: '选题完整，检索与核验链路清晰，实验设计充分。',
      assignedDays: -58,
      submittedDays: -55,
    },
    award: {
      level: 'SCHOOL',
      remark: '选题贴合校园场景，系统完整度高，文档规范。',
      awardedDays: -55,
    },
    archiveAtDays: -50,
  })

  const projectE = await createDemoProject({
    admin,
    topic: topic6,
    student: student5,
    advisor: advisor3,
    phase: 'MIDTERM',
    status: 'ACTIVE',
    startDays: -75,
    createdAtDays: -75,
    milestones: [
      {
        name: '开题报告提交',
        phase: 'PROPOSAL',
        due: -45,
        status: 'APPROVED',
        submitted: -52,
        comment: '问题定义清楚，先完成日志清洗与特征提取。',
      },
      {
        name: '中期检查材料',
        phase: 'MIDTERM',
        due: -8,
        status: 'PENDING',
      },
      { name: '答辩材料提交', phase: 'DEFENSE', due: 35 },
    ],
    taskBook: {
      content:
        '围绕实验室设备故障预测，完成日志采集、特征工程、风险评分与维护建议生成。',
      requirements:
        '1. 完成设备日志清洗；\n2. 每周提交指导记录；\n3. 输出可解释的维护建议；\n4. 论文不少于 1 万字。',
      status: 'CONFIRMED',
      issuedDays: -73,
      confirmedDays: -71,
    },
    guidance: [
      {
        weekNo: 1,
        content: '完成设备日志字段梳理，确定故障标签口径。',
        feedback: '先把标签口径与实验室老师确认，避免返工。',
        feedbackDays: -65,
        createdDays: -67,
      },
      {
        weekNo: 2,
        content: '完成日志清洗脚本，处理缺失值与异常值。',
        feedback: '保留清洗前后样本对比，后面写论文要用。',
        feedbackDays: -55,
        createdDays: -57,
      },
      {
        weekNo: 3,
        content: '完成基础特征提取，跑通逻辑回归基线。',
        createdDays: -47,
      },
      {
        weekNo: 4,
        content: '尝试时序特征与规则模型结合，准备中期材料。',
        createdDays: -37,
      },
    ],
    documents: [
      {
        fileName: '中期检查材料.md',
        filePath: midtermLab,
        version: 1,
        createdDays: -10,
      },
    ],
  })

  const projectF = await createDemoProject({
    admin,
    topic: topic8,
    student: student6,
    advisor: advisor2,
    phase: 'DEFENSE',
    status: 'ACTIVE',
    startDays: -190,
    defenseDays: -6,
    createdAtDays: -190,
    milestones: [
      {
        name: '开题报告提交',
        phase: 'PROPOSAL',
        due: -150,
        status: 'APPROVED',
        submitted: -158,
        comment: '规则分类清楚，同意开题。',
      },
      {
        name: '中期检查材料',
        phase: 'MIDTERM',
        due: -100,
        status: 'APPROVED',
        submitted: -108,
        comment: '规则引擎完成度不错，补充定位信息。',
      },
      {
        name: '答辩材料提交',
        phase: 'DEFENSE',
        due: -20,
        status: 'APPROVED',
        submitted: -26,
        comment: '材料完整，可以参加答辩。',
      },
    ],
    taskBook: {
      content:
        '面向毕业设计文档形式审查，构建可配置规则引擎，输出可定位的修改建议。',
      requirements:
        '1. 规则可配置；\n2. 每周提交指导记录；\n3. 在 30 份历史文档上验证；\n4. 论文不少于 1 万字。',
      status: 'CONFIRMED',
      issuedDays: -188,
      confirmedDays: -186,
    },
    guidance: Array.from({ length: 6 }, (_, index) => ({
      weekNo: index + 1,
      content: [
        '完成规范梳理，整理出结构、格式、引用三类规则。',
        '完成规则配置模型与解析器选型。',
        '完成章节结构检查与问题定位。',
        '完成格式检查与修复建议。',
        '完成 30 份历史文档验证。',
        '完成论文与答辩材料。',
      ][index],
      feedback: [
        '规则分类合理，先做可配置。',
        '解析器选型要关注中文文档。',
        '定位信息要精确到章节。',
        '建议按严重程度排序。',
        '补充误报分析。',
        '材料完整，注意答辩表达。',
      ][index],
      feedbackDays: -160 + index * 24,
      createdDays: -165 + index * 24,
    })),
    documents: [
      {
        fileName: '毕业设计论文.md',
        filePath: thesisCompliance,
        version: 2,
        createdDays: -30,
      },
    ],
    grade: makeGrade({
      advisorScore: 80,
      reviewerScore: 78,
      defenseScore: 78,
      plagiarismRate: 18.2,
      group: '软件学院第 3 组',
      location: '博学楼 B305',
      defenseDays: -6,
      publishedDays: -15,
    }),
    signatures: [{ user: student6, role: 'STUDENT', days: -10 }],
    blindReview: {
      reviewer: advisor,
      code: 'BR-2026-002',
      status: 'SUBMITTED',
      score: 84.5,
      comment: '规则设计完整，建议补充跨文档一致性检查。',
      assignedDays: -14,
      submittedDays: -12,
    },
  })

  // 演示文档均为 Markdown，直接写入解析结果，方便展示“文档解析”
  const seedDocuments = await prisma.document.findMany()
  for (const item of seedDocuments) {
    if (!item.fileName.toLowerCase().endsWith('.md')) continue
    const absolute = path.join(SEED_UPLOAD_DIR, path.basename(item.filePath))
    if (!fs.existsSync(absolute)) continue
    const text = fs.readFileSync(absolute, 'utf8')
    await prisma.document.update({
      where: { id: item.id },
      data: {
        textContent: text.slice(0, 200000),
        wordCount: text.replace(/\s/g, '').length,
        parseStatus: 'PARSED',
        parsedAt: new Date(),
      },
    })
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: advisor.id,
        type: 'APPLICATION_SUBMITTED',
        title: '收到新的课题申请',
        content: `沈知申请了你的课题《${topic2.title}》，请及时审核。`,
        createdAt: daysFromNow(-2),
      },
      {
        userId: advisor2.id,
        type: 'APPLICATION_SUBMITTED',
        title: '收到新的课题申请',
        content: `顾言申请了你的课题《${topic5.title}》，请及时审核。`,
        createdAt: daysFromNow(-1),
      },
      {
        userId: advisor.id,
        type: 'MILESTONE_SUBMITTED',
        title: '学生提交了里程碑材料',
        content: `《${topic2.title}》的「开题报告提交」已提交，请批阅。`,
        createdAt: daysFromNow(-1),
      },
      {
        userId: advisor.id,
        type: 'SYSTEM',
        title: '导师任务书待学生确认',
        content: `《${topic3.title}》的任务书已下达，等待学生确认。`,
        createdAt: daysFromNow(-3),
      },
      {
        userId: advisor2.id,
        type: 'SYSTEM',
        title: '收到一份盲审任务',
        content: '你被抽取为盲审评阅教师，请进入“盲审评阅”完成任务。',
        createdAt: daysFromNow(-1),
      },
      {
        userId: student.id,
        type: 'SYSTEM',
        title: '毕业设计成绩已发布',
        content: `《${topic1.title}》总评 87.8 分（良好），请查看。`,
        createdAt: daysFromNow(-2),
      },
      {
        userId: student2.id,
        type: 'MILESTONE_SUBMITTED',
        title: '里程碑已提交',
        content: '「开题报告提交」已提交，等待导师批阅。',
        createdAt: daysFromNow(-1),
      },
      {
        userId: student3.id,
        type: 'APPLICATION_APPROVED',
        title: '课题申请已通过',
        content: `你申请的课题《${topic3.title}》已通过，已创建项目与默认里程碑。`,
        isRead: true,
        createdAt: daysFromNow(-6),
      },
      {
        userId: student3.id,
        type: 'SYSTEM',
        title: '导师已下达任务书',
        content: `《${topic3.title}》的任务书已下达，请查看并确认。`,
        createdAt: daysFromNow(-3),
      },
      {
        userId: student4.id,
        type: 'SYSTEM',
        title: '毕业设计获评优秀论文',
        content: `《${topic4.title}》已获评校级优秀论文。`,
        isRead: true,
        createdAt: daysFromNow(-55),
      },
      {
        userId: student4.id,
        type: 'SYSTEM',
        title: '毕业设计已归档',
        content: `《${topic4.title}》已完成签章归档，可在“签章归档”中下载归档文件。`,
        isRead: true,
        createdAt: daysFromNow(-50),
      },
      {
        userId: student5.id,
        type: 'REMINDER',
        title: '中期检查材料已逾期',
        content: '你的中期检查材料已超过截止时间，请尽快提交。',
        createdAt: daysFromNow(-2),
      },
      {
        userId: student6.id,
        type: 'SYSTEM',
        title: '毕业设计成绩已发布',
        content: `《${topic8.title}》总评 78.6 分（中等），请查看。`,
        createdAt: daysFromNow(-15),
      },
      {
        userId: admin.id,
        type: 'SYSTEM',
        title: '质量抽检数据更新',
        content: '当前有 1 份盲审待评阅、1 份已提交，1 篇论文获评优秀。',
        createdAt: daysFromNow(-1),
      },
    ],
  })

  await prisma.activityLog.createMany({
    data: [
      {
        userId: student.id,
        action: 'APPLY_TOPIC',
        targetType: 'TOPIC',
        targetId: topic1.id,
        createdAt: daysFromNow(-140),
      },
      {
        userId: advisor.id,
        action: 'APPROVE_APPLICATION',
        targetType: 'TOPIC',
        targetId: topic1.id,
        createdAt: daysFromNow(-138),
      },
      {
        userId: student.id,
        action: 'SUBMIT_MILESTONE',
        targetType: 'MILESTONE',
        targetId: projectA.milestones[0].id,
        createdAt: daysFromNow(-92),
      },
      {
        userId: advisor.id,
        action: 'REVIEW_MILESTONE',
        targetType: 'MILESTONE',
        targetId: projectA.milestones[0].id,
        createdAt: daysFromNow(-90),
      },
      {
        userId: admin.id,
        action: 'PUBLISH_GRADE',
        targetType: 'PROJECT',
        targetId: projectA.id,
        createdAt: daysFromNow(-2),
      },
      {
        userId: student4.id,
        action: 'SIGN_PROJECT',
        targetType: 'PROJECT',
        targetId: projectD.id,
        createdAt: daysFromNow(-70),
      },
      {
        userId: admin.id,
        action: 'ARCHIVE_PROJECT',
        targetType: 'PROJECT',
        targetId: projectD.id,
        createdAt: daysFromNow(-50),
      },
      {
        userId: admin.id,
        action: 'AWARD_EXCELLENT',
        targetType: 'PROJECT',
        targetId: projectD.id,
        createdAt: daysFromNow(-55),
      },
      {
        userId: advisor.id,
        action: 'SUBMIT_BLIND_REVIEW',
        targetType: 'PROJECT',
        targetId: projectF.id,
        createdAt: daysFromNow(-12),
      },
      {
        userId: advisor2.id,
        action: 'SUBMIT_GUIDANCE',
        targetType: 'PROJECT',
        targetId: projectB.id,
        createdAt: daysFromNow(-18),
      },
    ],
  })

  console.log('[seed] 完成，演示账号（密码均为 123456）：')
  console.log(`  教务 admin@demo.edu        ${admin.name}`)
  console.log(`  导师 advisor@demo.edu      ${advisor.name}（计算机学院）`)
  console.log(`  导师 advisor2@demo.edu     ${advisor2.name}（软件学院）`)
  console.log(`  导师 advisor3@demo.edu     ${advisor3.name}（人工智能学院）`)
  console.log(`  学生 student@demo.edu      ${student.name}（答辩阶段，待归档）`)
  console.log(`  学生 student2@demo.edu     ${student2.name}（开题待批阅）`)
  console.log(`  学生 student3@demo.edu     ${student3.name}（任务书待确认）`)
  console.log(`  学生 student4@demo.edu     ${student4.name}（已归档 + 校级优秀）`)
  console.log(`  学生 student5@demo.edu     ${student5.name}（中期逾期，高风险）`)
  console.log(`  学生 student6@demo.edu     ${student6.name}（答辩完成，待导师签名）`)
  console.log(`  学生 student7@demo.edu     ${student7.name}（课题申请待审核）`)
  console.log(`  学生 student8@demo.edu     ${student8.name}（课题申请待审核）`)
  console.log(
    `[seed] 项目 ${await prisma.project.count()} 个 / 申请 ${await prisma.topicApplication.count()} 条 / 盲审 ${await prisma.blindReview.count()} 份 / 优秀论文 ${await prisma.excellentAward.count()} 篇`,
  )
}

main()
  .catch((error) => {
    console.error('[seed] 失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
