# 项目架构文档

> 规范依据：CLAUDE.md §8.1 — 绘制模块依赖图，标注 Store 依赖和路由关系。

## 一、技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | Vue 3（Composition API + `<script setup>`） |
| 状态管理 | Pinia（Setup Store） |
| 路由 | Vue Router 5 |
| UI 库 | Element Plus（`unplugin-vue-components` 按需引入） |
| 构建 | Vite 8 |
| 后端 | Node.js + Express 5 |
| ORM / 数据库 | Prisma + MySQL 8 |
| 鉴权 | JWT + RBAC（STUDENT / ADVISOR / ADMIN） |
| 文件上传 | Multer（内存解析 + 魔数校验，10MB 限制）；本地磁盘或 OSS 私有桶，下载统一经鉴权接口转发 |
| 测试 | Vitest + jsdom（前端组件 / 逻辑）；node:test（后端纯函数与 HTTP 接口） |
| 部署 | Docker Compose：MySQL + Node 服务 + Nginx |

## 二、目录结构

```
claude_code_demo/
├── src/                          # 前端
│   ├── app/
│   │   ├── layouts/MainLayout.vue    # 顶栏、导航、通知中心
│   │   └── router.js                 # 路由 + 登录/角色守卫
│   ├── features/
│   │   ├── auth/LoginView.vue
│   │   ├── topic/TopicListView.vue
│   │   ├── application/ApplicationListView.vue
│   │   ├── project/ProjectListView.vue
│   │   ├── project/ProjectDetailView.vue
│   │   ├── dashboard/DashboardView.vue
│   │   ├── notification/NotificationListView.vue
│   │   ├── admin/UserListView.vue
│   │   ├── admin/AuditLogView.vue
│   │   ├── review/AdminBlindReviewView.vue   # 教务：盲审抽检
│   │   ├── review/MyBlindReviewView.vue      # 导师：匿名评阅
│   │   ├── review/AdminExcellentView.vue     # 教务：优秀论文评选
│   │   ├── review/ExcellentHallView.vue      # 全角色：优秀论文展示
│   │   ├── search/GlobalSearch.vue
│   │   └── error/ErrorView.vue
│   ├── shared/
│   │   ├── api/                      # request + auth/topic/application/project/notification/stats
│   │   ├── components/               # AppLoading、RouteProgress、AnimatedNumber、EmptyState、ParticleField、AiCopilot、CustomCursor
│   │   ├── types/dict.js             # 全部字典集中维护
│   │   └── utils/format.js
│   └── stores/                       # auth、notification
├── server/                       # 后端
│   ├── prisma/
│   │   ├── schema.prisma            # 15 个模型 + 12 个枚举
│   │   └── seed.js                  # 演示数据
│   ├── src/
│   │   ├── app.js / index.js
│   │   ├── config/                  # env、upload
│   │   ├── middlewares/             # authenticate、requireRole、错误处理、安全头、限流
│   │   ├── routes/                  # auth/topic/application/project/milestone/notification/stats/user/log/export/search/mail/blindReview/excellent/ai
│   │   ├── services/                # risk、project、notification、compliance、archive、mail、excellent、storage、ai
│   │   └── utils/                   # jwt、password、pagination、publicUser
│   ├── scripts/                     # db:check 演示数据自检
│   └── test/                        # risk / compliance / archive / csv / excellent / upload / http
├── e2e/                          # Playwright 三浏览器端到端测试
├── docs/                         # 架构、接口、组件、竞赛方案
├── Dockerfile                    # 前端构建 + Nginx
├── docker-compose.yml            # MySQL + 后端 + 前端
└── nginx.conf
```

### 2.1 五层架构映射

参考通用移动端的 `pages / components / service / model / common` 分层，本项目按 Web 全栈场景做了等价落地；分层原则一致，目录名按业务特性组织：

| 通用分层 | 本项目落点 | 说明 |
| --- | --- | --- |
| 页面层 | `src/features/*/…View.vue` | 登录、课题、申请、项目、看板、盲审、优秀论文、用户与审计页面 |
| 组件层 | `src/features/project/components/`、`src/shared/components/` | 任务书、文档、指导、成绩、签章、空状态、加载、粒子背景等可复用 UI |
| 服务层 | `src/shared/api/` | `request.js` 统一注入 JWT、超时、401 登出与错误提示，各业务 API 只声明路径与参数 |
| 数据层 | `src/stores/` + `server/prisma/schema.prisma` | 前端只保留会话与通知状态；业务数据模型与关系由后端 Prisma 统一定义，避免双份模型漂移 |
| 工具层 | `src/shared/utils/`、`src/app/`、`server/src/utils/` | 日期格式化、字典、路由、分页、CSV、JWT、密码等纯函数与基础设施 |

后端对应为 `routes（接口层）→ services（业务层）→ prisma（数据访问层）`，中间件负责鉴权、限流、安全头与统一错误处理。

## 三、模块依赖关系

```
App.vue
  └── <router-view>
        ├── LoginView ──────────→ auth store ──→ /api/auth
        └── MainLayout
              ├── 通知中心 ──────→ notification store ──→ /api/notifications
              ├── TopicListView ─→ /api/topics
              ├── ApplicationListView ─→ /api/applications
              ├── ProjectListView ─→ /api/projects
              ├── ProjectDetailView
              │     ├── /api/projects/:id
              │     ├── /api/milestones/:id/submit|review
              │     └── /api/projects/:id/documents
              └── DashboardView ─→ /api/stats/overview
```

前端不直接访问数据库；所有数据经 `shared/api/request.js`（JWT 注入、超时、统一错误）调用后端。

## 四、后端分层

```
请求
  → 路由（routes/*.routes.js）
      → 鉴权中间件（authenticate / requireRole）
      → 业务校验（HttpError → 统一错误中间件）
      → Prisma（事务用于申请通过 + 立项）
  → 响应
```

| 模块 | 职责 |
| --- | --- |
| `middlewares/auth.js` | 解析 Bearer Token，查库校验账号状态与最新角色 |
| `middlewares/error.js` | 统一 400/401/403/404/409/500 与 Prisma 错误 |
| `services/risk.service.js` | 纯函数风险评分，无副作用，便于单测 |
| `services/project.service.js` | 默认里程碑与阶段顺序 |
| `services/notification.service.js` | 通知与操作日志写入 |

## 五、数据模型

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `users` | role, studentNo, isActive | 三角色账户，停用后禁止登录 |
| `topics` | advisorId, capacity, status | 导师发布课题 |
| `topic_applications` | topicId, studentId, status | 学生申请，唯一约束防重复 |
| `projects` | topicId, studentId, advisorId, currentPhase | 课题名额可 >1，同一课题可对应多个项目（无唯一约束） |
| `milestones` | projectId, phase, dueDate, status | 开题 / 中期 / 答辩节点 |
| `task_books` | projectId（唯一）, content, status | 任务书下达与确认 |
| `guidance_records` | projectId, weekNo, content, feedback | 每周指导记录与导师反馈 |
| `grades` | projectId（唯一）, 三项评分, finalScore, level, plagiarismRate | 评阅、答辩与成绩 |
| `signatures` | projectId, userId, role, imageData | 学生 / 导师 / 教务电子签名 |
| `archives` | projectId（唯一）, html, digest, archivedAt | 归档 HTML 快照与 SHA-256 摘要 |
| `blind_reviews` | projectId, reviewerId, anonymousCode（唯一）, score, status | 盲审抽检任务与匿名评阅结果 |
| `excellent_awards` | projectId（唯一）, level, remark, awardedById | 校级 / 院级优秀论文 |
| `documents` | projectId, milestoneId?, version | 同名文件版本累加 |
| `notifications` | userId, type, isRead | 站内通知 |
| `activity_logs` | userId, action, targetType/Id | 审计追踪 |

## 六、核心业务流

### 6.1 申请 → 立项

```
学生提交申请（PENDING）
  → 导师/教务审核
      ├─ 驳回 → 通知学生
      └─ 通过 → 事务：
            1. 校验学生无进行中项目
            2. 申请置为 APPROVED
            3. 创建项目（TOPIC 阶段）
            4. 生成 3 个默认里程碑
            5. 名额满则关闭课题
            6. 通知学生 + 写操作日志
```

### 6.2 里程碑 → 批阅

```
学生提交（PENDING/REJECTED → SUBMITTED，记录提交时间）
  → 通知导师
  → 导师批阅（SUBMITTED → APPROVED / REJECTED + 意见）
  → 通知学生
```

### 6.3 任务书与指导记录

```
导师下达任务书（ISSUED） → 学生确认（CONFIRMED）
  → 学生每周提交指导记录 → 导师逐条反馈
  → 记录数与任务书状态参与合规检查
```

### 6.4 评阅 → 答辩 → 成绩

```
导师评分 + 评阅评分 + 答辩评分（30% / 30% / 40%）
  → 系统计算总评与等级 → 教务发布 → 学生可见 → 成绩单导出
```

### 6.5 签章与归档

```
学生 / 导师 / 教务手写签名
  → 成绩发布 → 教务归档 → 生成 HTML 快照（含签名）并写入 SHA-256 摘要
  → 项目锁定为 ARCHIVED
  → 校验时重新计算摘要并与归档值比对
```

### 6.6 盲审抽检

```
成绩发布 → 教务设置抽取数量（1—20）
  → 从“已发布且未抽检”项目中随机抽取
  → 为每篇分配非本人导师的评阅教师，生成匿名编号 BR-年份-序号
  → 通知评阅教师 → 导师匿名评阅（不可见学生 / 导师信息）
  → 提交评分与意见 → 教务统计总量、待评阅与平均分
```

### 6.7 优秀论文评选

```
成绩已发布 → 规则引擎判定资格
  → 总评 ≥85、查重率 ≤30%、合规分 ≥80
  → 教务授予校级 / 院级 → 通知学生与导师 → 展示页公开
  → 支持撤销并恢复候选资格
```

### 6.8 风险评分

四个因子归一化后加权求和：

| 因子 | 权重 | 计算方式 |
| --- | --- | --- |
| 里程碑逾期 | 0.35 | 逾期占比 × 0.6 + 逾期天数 / 60 |
| 整体完成度 | 0.25 | 1 − 已通过里程碑 / 总里程碑 |
| 临近截止 | 0.20 | 1 − 最近截止天数 / 14 |
| 批阅等待 | 0.20 | 平均等待天数 / 7 |

分数 0—100，≥60 高风险、≥30 中风险、其余低风险；同时返回每个因子的贡献分与改进建议，保证可解释。

### 6.9 AI 辅助

```
导师 / 教务在页面触发
  → 后端按场景组装上下文（项目、成绩、合规、指导记录）
  → 调用千问 / DeepSeek（OpenAI 兼容 chat/completions）
  → 返回草稿文本 → 人工修改后保存
```

未配置 Key 时返回 503；AI 只生成草稿，不直接写入成绩或评语。

全局入口为 `AiCopilot`（右下角悬浮球 + 抽屉对话），支持按角色给出快捷问题；未配置 Key 时使用内置规则回答并标注 `LOCAL`。

## 七、路由表

| 路径 | 名称 | 组件 | 权限 |
| --- | --- | --- | --- |
| `/login` | Login | `features/auth/LoginView.vue` | 未登录 |
| `/topics` | Topics | `features/topic/TopicListView.vue` | 已登录 |
| `/projects` | Projects | `features/project/ProjectListView.vue` | 已登录 |
| `/projects/:id` | ProjectDetail | `features/project/ProjectDetailView.vue` | 项目相关人 |
| `/applications` | Applications | `features/application/ApplicationListView.vue` | 已登录（按角色过滤） |
| `/dashboard` | Dashboard | `features/dashboard/DashboardView.vue` | 导师 / 教务 |
| `/notifications` | Notifications | `features/notification/NotificationListView.vue` | 已登录 |
| `/admin/users` | AdminUsers | `features/admin/UserListView.vue` | 教务 |
| `/admin/logs` | AdminLogs | `features/admin/AuditLogView.vue` | 教务 |
| `/blind-reviews` | MyBlindReviews | `features/review/MyBlindReviewView.vue` | 导师 |
| `/admin/blind-reviews` | AdminBlindReviews | `features/review/AdminBlindReviewView.vue` | 教务 |
| `/excellent` | ExcellentHall | `features/review/ExcellentHallView.vue` | 已登录 |
| `/admin/excellent` | AdminExcellent | `features/review/AdminExcellentView.vue` | 教务 |
| `/error?code=` | Error | `features/error/ErrorView.vue` | 公开 |
| `/:pathMatch(.*)*` | NotFound | `features/error/ErrorView.vue` | 公开 |

## 八、部署

```
浏览器
  → Nginx（:8080）
      ├── /            → dist 静态资源（SPA 回退 index.html）
      └── /api/        → server:3100（含文件下载）
  → Node 服务（:3100）
      → MySQL 8（:3306，容器内）
```

本地开发：Vite `:5181` 代理 `/api` 到 `:3100`。

上传文件不设公开静态目录：`/uploads` 不再对外暴露，OSS 桶保持私有读。下载必须命中
`GET /api/projects/:id/documents/:docId/download`（项目相关人）或
`GET /api/blind-reviews/:id/documents/:docId/download`（被分配的评阅教师），
服务端校验归属后以 `Content-Disposition: attachment` 转发，盲审下载还会把文件名替换为匿名编号。

### 体验层

- 路由进度条：`app/progress.js` + `shared/components/RouteProgress.vue`
- 启动加载：`shared/components/AppLoading.vue`（等待 `router.isReady()`）
- 页面转场：`MainLayout` 内 `<transition name="page" mode="out-in">`，全局样式在 `style.css`
- 数字滚动：`shared/components/AnimatedNumber.vue`
- 空状态：`shared/components/EmptyState.vue`
- 粒子背景：`shared/components/ParticleField.vue`（登录页深色粒子 + 全站环境粒子，支持鼠标微交互）
- 专属鼠标指针：`shared/components/CustomCursor.vue`（箭头造型、玉青描边、悬停/文本/加载/左右中键状态，仅桌面端）
- AI 助教：`shared/components/AiCopilot.vue`（悬浮球 + 抽屉对话）
- 错误页：`features/error/ErrorView.vue`（404 / 403 / 500，`router.onError` 兜底）
- 动效降级：`prefers-reduced-motion` 全局关闭动画与平滑滚动

## 九、测试与质量

- 前端单元测试：`npm run test:unit`（Vitest + jsdom，请求封装 / auth store / 格式化 / 空状态 / 错误页，共 16 个用例）
- 前端 E2E：`npm run test:e2e`（Playwright，Chromium / Firefox / WebKit 三浏览器，项目详情五标签 / 文档下载 / 403 / 教务管理页，共 9 个用例）
- 并发与压力：`npm run test:concurrency`（真实 MySQL 下名额并发、一人一项目并发与只读接口压测）
- 后端单元测试：`npm test`（风险评分 + 合规检查 + 归档 HTML + CSV + 优秀论文规则 + 上传内容校验 27 个纯函数用例，加 Express 鉴权 / 路由 / 安全头 12 个 HTTP 用例，共 39 个）
- 规范检查：`npm run lint`（ESLint --max-warnings 0，忽略 server/）
- 构建：`npm run build`
- CI：`.github/workflows/ci.yml` 执行七道 job：lint → unit（前端 Vitest）+ test（后端）+ integration（并发）+ e2e（三浏览器）+ docker（镜像与健康检查）+ build
  - 现状：本轮扩展后由 CI 自动校验；上一轮 run 40615825656 的五道 job 已全部通过。

## 十、开发阶段与交付物

对照“环境准备 → 架构设计 → 需求分析 → 项目创建 → 代码开发 → 错误修复 → 运行调试 → 打包上线”：

| 阶段 | 状态 | 交付物 / 证据 |
| --- | --- | --- |
| 开发环境准备 | 已完成 | `package.json`、`server/.env.example`、README 运行说明 |
| 架构设计 | 已完成 | 本文档、五层映射、后端分层、数据模型与路由表 |
| 功能需求分析 | 已完成 | README 功能清单、`docs/4c-competition-plan.md` |
| 项目创建 | 已完成 | `src/`、`server/`、`docs/` 与 Prisma schema |
| 代码开发 | 已完成 | 11 个前端业务视图、15 个数据模型、15 组后端路由 |
| 错误修复 | 已完成 | 测试报告 D-01—D-14；并发行锁、鉴权查库、401 登出、403 页 |
| 运行调试 | 已完成 | 39 个后端 + 16 个前端单元 + 9 个三浏览器 E2E、并发与压力测试、`npm run db:check` |
| 打包上线 | 已完成 | GitHub Actions 五道 job 全部通过；CI 已构建镜像、启动 MySQL / 后端 / 前端并完成健康检查；本机未启动 Docker Desktop 复跑 |

## 变更记录

| 日期 | 版本 | 变更说明 |
| --- | --- | --- |
| 2026-06-29 | v0.1.0 | 初始架构文档（纯前端 Mock） |
| 2026-10-22 | v1.0.0 | 接入 Node + MySQL 后端，新增风险评分、看板、文档与部署方案 |
| 2026-10-23 | v1.1.0 | 新增用户管理、审计日志、CSV 导出、全局搜索、批量催办与通知中心 |
| 2026-10-23 | v1.2.0 | 新增任务书、指导记录、评阅答辩成绩、合规检查与成绩看板 |
| 2026-10-23 | v1.3.0 | 新增电子签章、项目归档、邮件通知与外部接口对接清单 |
| 2026-10-23 | v1.4.0 | 新增盲审抽检、优秀论文评选与展示 |
| 2026-10-23 | v1.5.0 | 新增归档摘要校验、阿里云 OSS 存储适配与 AI 辅助 |
| 2026-10-23 | v1.6.0 | 新增粒子光效组件、AI 助教悬浮球与抽屉式搜索 |
| 2026-10-23 | v1.7.0 | 新增项目专属鼠标指针与鼠标跟随光效 |
| 2026-10-23 | v1.8.0 | 指针升级为箭头多状态；背景增加闪烁粒子、鼠标连线与环境光；优化登录页窄屏布局；补充安全响应头、登录/AI 限流与优雅退出；移除早期 todo 示例模块 |
| 2026-10-25 | v1.9.0 | 移除 `/uploads` 静态目录与 OSS 公共读，改为鉴权下载接口 + 服务端转发；上传增加魔数校验；盲审下载匿名化；文档接口字段白名单；修正文档与代码不一致描述 |
| 2026-10-26 | v1.9.1 | 审核名额与学生立项增加事务行锁；鉴权改为查库校验状态与最新角色；401 统一登出；Docker 必填密钥；补充业务索引、可选分页与 12 个 HTTP 测试 |
