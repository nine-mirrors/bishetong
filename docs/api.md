# 接口清单

> 规范依据：CLAUDE.md §2.4 / §3.4 — 所有接口字段以本文档为准。
> 服务地址：本地 `http://localhost:3100/api`，前端通过 Vite 代理 `/api` 访问。

## 通用约定

- 鉴权：除登录、注册、健康检查外，均需请求头 `Authorization: Bearer <token>`
- 错误响应：`{ "message": "错误说明" }`，HTTP 状态码 400 / 401 / 403 / 404 / 409 / 429 / 500
- 分页参数：`page`（默认 1）、`pageSize`（默认 10，最大 100）
- 分页响应：`{ list, total, page, pageSize }`
- 从属列表（文档 / 指导记录 / 签章 / 优秀论文候选与获奖）默认返回数组；传 `page` 或 `pageSize` 后改为分页响应，便于数据量增长后平滑切换
- 鉴权校验：每个请求都会查库确认账号仍存在、`isActive` 为真，并以数据库中的最新角色为准（Token 内的 `role` 仅作签发记录）
- 角色：`STUDENT`（学生）、`ADVISOR`（导师）、`ADMIN`（教务）
- 限流：登录 10 次/分钟、注册 5 次/分钟、AI 调用 20 次/分钟，超限返回 429 并带 `Retry-After`
- 安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`

## 健康检查

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 返回 `{ status: 'ok', time }` |

## 认证

| Method | URL | 角色 | 请求字段 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | `{ name, email, password, studentNo?, department? }` | `{ token, user }` |
| POST | `/api/auth/login` | 公开 | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | 已登录 | — | `user` |
| PUT | `/api/auth/password` | 已登录 | `{ oldPassword, newPassword }` | `{ message }` |

`user` 字段：`{ id, name, email, role, studentNo, department, isActive, createdAt }`（不返回密码哈希）。

## 课题

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/topics?keyword=&status=&page=&pageSize=` | 已登录 | 课题列表，附带 `approvedCount` 与当前学生的 `myApplication` |
| GET | `/api/topics/:id` | 已登录 | 课题详情 |
| POST | `/api/topics` | 导师 / 教务 | 发布课题，`{ title, description, capacity }`（名额 1—5） |
| POST | `/api/topics/:id/apply` | 学生 | 申请课题，`{ statement }`（至少 10 字） |

校验规则：课题关闭、名额已满、重复申请均返回 409。

## 课题申请

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/applications?status=&page=&pageSize=` | 已登录 | 学生看自己，导师看自己课题，教务看全部 |
| PUT | `/api/applications/:id/review` | 导师 / 教务 | `{ action: 'APPROVED' \| 'REJECTED', reviewComment? }` |

通过申请时在同一事务内：更新申请状态 → 创建项目 → 生成 3 个默认里程碑（开题 30 天、中期 60 天、答辩 90 天）→ 名额满则关闭课题 → 通知学生。

## 项目

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects?phase=&status=&keyword=&page=&pageSize=` | 已登录 | 学生看自己，导师看名下，教务看全部；每条附带 `risk`；`keyword` 匹配项目名或学生姓名 |
| GET | `/api/projects/:id` | 项目相关人 | 项目详情，含里程碑、文档、风险评分 |
| PATCH | `/api/projects/:id/phase` | 导师 / 教务 | `{ phase }`，只能按 `TOPIC → PROPOSAL → MIDTERM → DEFENSE → ARCHIVED` 逐级推进 |
| POST | `/api/projects/remind` | 导师 / 教务 | `{ projectIds: string[] }`，批量向学生发送催办通知（单次 ≤ 50） |

### 风险评分结构

```json
{
  "score": 28,
  "level": "LOW",
  "levelLabel": "低风险",
  "factors": [
    {
      "key": "completion",
      "label": "整体完成度偏低",
      "advice": "按阶段拆分任务，优先推进未开始的里程碑",
      "weight": 0.25,
      "raw": 1,
      "contribution": 25
    }
  ],
  "summary": {
    "total": 3,
    "approved": 0,
    "overdue": 0,
    "overdueDays": 0,
    "pendingReview": 1,
    "pending": 3,
    "nearestDueDays": 19,
    "avgReviewWaitDays": 1
  }
}
```

权重：逾期 0.35、完成度 0.25、临近截止 0.20、批阅等待 0.20；分数 0—100，≥60 高、≥30 中、其余低。

## 里程碑

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| PUT | `/api/milestones/:id/submit` | 学生（本人） | 待提交 / 已退回 → 待批阅 |
| PUT | `/api/milestones/:id/review` | 导师 / 教务 | `{ status: 'APPROVED' \| 'REJECTED', reviewComment? }` |

## 文档

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/projects/:id/documents` | 项目相关人 | `multipart/form-data`，字段 `file`、可选 `milestoneId`；上传后自动解析文本 |
| GET | `/api/projects/:id/documents` | 项目相关人 | 文档列表，含 `parseStatus` / `wordCount` / `parsedAt` |
| GET | `/api/projects/:id/documents/:docId/content` | 项目相关人 | 读取解析后的文本内容 |
| POST | `/api/projects/:id/documents/:docId/parse` | 项目相关人 | 重新解析文档（PDF / DOCX / MD / TXT） |
| GET | `/api/projects/:id/documents/:docId/download` | 项目相关人 | 下载原始文件，服务端校验归属后以附件转发 |
| GET | `/api/blind-reviews/:id/documents/:docId/download` | 被分配的评阅教师 | 下载盲审材料，文件名替换为匿名编号 |

限制：pdf / doc / docx / md / txt / zip / xlsx / pptx，单个文件 ≤ 10MB；同名文件自动累加 `version`。上传时会校验文件头魔数，内容与扩展名不符直接返回 400。接口不返回服务端存储路径，`/uploads` 也不对外开放；配置阿里云 OSS 时 Bucket 保持私有读，文件由服务端读取后转发。PDF、DOCX、MD、TXT 会自动提取文本并统计字数；DOC、ZIP、XLSX、PPTX 暂标记为 `UNSUPPORTED`。

## 任务书

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/taskbook` | 项目相关人 | 任务书详情，未下达时返回 `null` |
| PUT | `/api/projects/:id/taskbook` | 导师 / 教务 | `{ content, requirements? }`，保存后状态为 `ISSUED` |
| POST | `/api/projects/:id/taskbook/confirm` | 学生（本人） | 确认任务书，状态变为 `CONFIRMED` |

状态流转：`DRAFT → ISSUED → CONFIRMED`；导师可修改并重新下达，学生需重新确认。

## 指导记录

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/guidance` | 项目相关人 | 按周次倒序返回指导记录 |
| POST | `/api/projects/:id/guidance` | 学生（本人） | `{ weekNo, content }`，周次 1—30，同一周不可重复 |
| PUT | `/api/projects/:id/guidance/:recordId/feedback` | 导师 / 教务 | `{ feedback }`，回复后通知学生 |

## 评阅与成绩

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/grade` | 项目相关人 | 成绩与答辩安排；学生仅能看到已发布成绩 |
| PUT | `/api/projects/:id/grade` | 导师 / 教务 | `{ advisorScore, reviewerScore, defenseScore, plagiarismRate, defenseGroup, defenseLocation, defenseAt }` |
| POST | `/api/projects/:id/grade/publish` | 教务 | 发布成绩并通知学生，发布后不可修改 |

总评 = 导师 30% + 评阅 30% + 答辩 40%；≥90 优秀、≥80 良好、≥70 中等、≥60 及格。

## 合规检查

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/compliance` | 项目相关人 | 规则引擎输出 0—100 分与六项检查结果 |

检查项：任务书确认 20、指导记录 ≥6 次 20、开题通过 20、中期通过 20、论文文档 15、查重率 ≤30% 5。

## 电子签章

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/signatures` | 项目相关人 | 返回学生 / 导师 / 教务签名（Base64 PNG） |
| POST | `/api/projects/:id/signatures` | 项目相关人 | `{ imageData }`，需 `data:image/png;base64,` 前缀，≤ 400KB |

签名按 `projectId + userId` 唯一，重复提交视为重新签名；已归档项目禁止修改。

## 归档

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/projects/:id/archive` | 项目相关人 | 归档元信息，含 `hasTimestamp` / `timestampedAt` / `tsaUrl`，未归档返回 `null` |
| POST | `/api/projects/:id/archive` | 教务 | 需成绩已发布 + 学生、导师与教务均已签名；生成 HTML 快照、SHA-256 摘要与 RFC 3161 可信时间戳，并锁定项目 |
| GET | `/api/projects/:id/archive/verify` | 项目相关人 | 重新计算 SHA-256 并与归档摘要比对，同时校验时间戳令牌，返回 `{ verifiable, valid, digest, computed, timestamp }` |
| GET | `/api/projects/:id/archive/download` | 项目相关人 | 下载归档 HTML（打印样式，可直接存 PDF） |
| GET | `/api/projects/:id/archive/timestamp` | 项目相关人 | 下载 `.tsr` 时间戳凭证（RFC 3161） |

## 邮件

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/mail/status` | 教务 | 返回 `{ enabled }`，判断 SMTP 是否配置 |
| POST | `/api/mail/test` | 教务 | 向当前教务邮箱发送测试邮件 |

配置 `SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM` 后，所有站内通知会同步发送邮件；未配置时自动跳过。

## 盲审抽检

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/blind-reviews/candidates` | 教务 | 成绩已发布且尚未抽检的项目 |
| POST | `/api/blind-reviews/sample` | 教务 | `{ count }`（1—20），随机抽取并自动分配非本人导师的评阅教师 |
| GET | `/api/blind-reviews?status=&page=&pageSize=` | 教务 | 全部盲审任务，含项目、评阅教师、评分与状态 |
| GET | `/api/blind-reviews/my` | 导师 | 本人的盲审任务，仅返回匿名编号、项目标题与材料，不含学生 / 导师信息 |
| POST | `/api/blind-reviews/:id/submit` | 导师（本人） | `{ score, comment }`，评分 0—100、意见 ≥5 字；提交后不可重复提交 |
| DELETE | `/api/blind-reviews/:id` | 教务 | 撤销盲审任务 |
| GET | `/api/blind-reviews/stats` | 教务 | `{ total, submitted, pending, average }` |

匿名编号格式 `BR-年份-序号`，按年份递增且不与已删除任务冲突；抽取时按顺序轮询可用评阅教师，避免分配到本人导师。

## 优秀论文评选

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/excellent/candidates` | 教务 | 项目候选列表，返回总评、查重、合规分、评选资格与原因、获奖信息 |
| GET | `/api/excellent/awards` | 已登录 | 获奖列表，含项目、学生、导师与评语 |
| POST | `/api/excellent/awards` | 教务 | `{ projectId, level: 'SCHOOL' \| 'COLLEGE', remark? }`，重复提交为更新 |
| DELETE | `/api/excellent/awards/:projectId` | 教务 | 撤销获奖 |

评选规则：成绩已发布、总评 ≥85、查重率 ≤30%、合规分 ≥80；不满足时接口返回 409 并列出原因。

## AI 辅助

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/ai/status` | 已登录 | 返回 `{ enabled, defaultProvider, providers }`，用于判断是否配置 Key |
| POST | `/api/ai/chat` | 已登录 | `{ messages: [{ role, content }], context? }`，AI 助教对话，保留最近 10 条 |
| POST | `/api/ai/assist` | 导师 / 教务 | `{ type, projectId, recordId?, provider? }`，返回 `{ content, provider, model }` |

`type` 取值：`guidance_feedback`（指导反馈草稿，需 `recordId`）、`award_remark`（优秀论文评语）、`compliance_advice`（合规改进建议）。
支持 `qwen`（千问）与 `deepseek` 两个 OpenAI 兼容渠道；未配置 Key 时返回 503。

## 通知

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notifications?status=&page=&pageSize=` | 已登录 | `{ list, total, unreadCount }`；`status=UNREAD` 只看未读 |
| PUT | `/api/notifications/:id/read` | 本人 | 标记单条已读 |
| PUT | `/api/notifications/read-all` | 本人 | 全部已读，返回 `{ updated }` |

## 统计看板

| Method | URL | 角色 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/stats/overview` | 导师 / 教务 | 项目数、学生数、待审核申请、逾期与待批阅里程碑、阶段分布、风险分布、导师负载、高风险 Top 5；教务额外返回 `quality`（盲审与优秀论文统计） |

## 用户管理（教务）

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/users?keyword=&role=&status=&page=&pageSize=` | 用户列表，支持姓名 / 邮箱 / 学号搜索 |
| POST | `/api/users` | `{ name, email, password, role, studentNo?, department? }` |
| PATCH | `/api/users/:id/status` | `{ isActive }`，不能停用当前登录账号 |
| PATCH | `/api/users/:id/password` | `{ password }`，重置密码 |

停用账号登录时返回 403「账号已被停用，请联系教务」。

## 审计日志（教务）

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/logs?action=&targetType=&page=&pageSize=` | 操作记录，含操作人、动作、对象类型与对象 ID |

已记录动作：提交/审核申请、提交/批阅里程碑、创建/启用/停用用户、重置密码、批量催办、创建/提交/撤销盲审、评选/撤销优秀论文。

## 数据导出（导师 / 教务）

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/export/projects.csv` | 项目汇总，按角色范围导出，含里程碑进度与风险分 |
| GET | `/api/export/applications.csv` | 申请明细，含审核人、意见与时间 |
| GET | `/api/export/grades.csv` | 成绩汇总（仅教务），含三项评分、总评、等级与答辩安排 |

响应头为 `text/csv; charset=utf-8`，内容带 BOM，可直接用 Excel 打开。

## 全局搜索

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/search?q=` | 返回 `{ topics, projects, users }`；课题与项目按角色范围过滤，用户仅教务可见 |

## 变更记录

| 日期 | 版本 | 变更说明 |
| --- | --- | --- |
| 2026-06-29 | v0.1.0 | 初始文档（Mock 阶段） |
| 2026-10-22 | v1.0.0 | 接入真实后端：认证、课题、申请、项目、里程碑、文档、通知、统计 |
| 2026-10-23 | v1.1.0 | 新增用户管理、审计日志、CSV 导出、全局搜索、批量催办、自助改密与通知筛选 |
| 2026-10-23 | v1.2.0 | 新增任务书、指导记录、评阅与答辩成绩、合规检查、成绩导出与成绩看板 |
| 2026-10-23 | v1.3.0 | 新增电子签章、项目归档、邮件通知与 SMTP 测试接口 |
| 2026-10-23 | v1.4.0 | 新增盲审抽检与优秀论文评选接口 |
| 2026-10-23 | v1.5.0 | 新增归档摘要校验、阿里云 OSS 上传与 AI 辅助接口 |
| 2026-10-23 | v1.6.0 | 新增 AI 助教对话接口；全局搜索改为抽屉式交互 |
| 2026-10-23 | v1.8.0 | 新增登录/AI 限流与安全响应头；看板统计补充 `quality` |
| 2026-10-25 | v1.9.0 | 移除 `/uploads` 静态访问，文档与盲审材料改为鉴权下载；上传增加魔数校验；文档接口字段白名单 |
| 2026-10-26 | v1.9.1 | 鉴权查库校验账号状态与最新角色；从属列表支持可选分页；401 统一登出并跳转登录页 |
