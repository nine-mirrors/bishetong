# 毕设通 —— 毕业设计全流程管理系统

[![CI](https://github.com/nine-mirrors/bishetong/actions/workflows/ci.yml/badge.svg)](https://github.com/nine-mirrors/bishetong/actions/workflows/ci.yml)

面向本科毕业设计场景，连接学生、导师、教务三方，用任务化协作替代「微信群 + Excel + 邮件」的碎片化管理。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3 + Vite + Pinia + Vue Router + Element Plus（按需引入） |
| 后端 | Node.js + Express 5 + Prisma |
| 数据库 | MySQL 8 |
| 鉴权 | JWT + 三角色（STUDENT / ADVISOR / ADMIN） |
| 文件存储 | 本地磁盘 / 阿里云 OSS（可选） |
| AI | 千问 / DeepSeek（OpenAI 兼容，可选） |

## 目录结构

```
claude_code_demo/
├── src/                    # 前端
│   ├── app/                # 路由与主布局
│   ├── features/           # 业务模块（auth / topic / application / project / dashboard / notification / admin / review / search）
│   ├── shared/             # api / types / utils / components
│   └── stores/             # auth、notification
├── server/                 # 后端
│   ├── prisma/             # schema.prisma、seed.js
│   └── src/
│       ├── routes/         # auth / topics / applications / projects / milestones / notifications / users / logs / export / search / blind-reviews / excellent
│       ├── middlewares/    # 鉴权、角色、错误处理
│       ├── services/       # 项目、风险、合规、归档、文档解析、时间戳、AI、通知、存储
│       └── utils/          # JWT、密码、分页
└── docs/                   # 架构、接口、组件、竞赛方案
```

## 本地启动

### 1. 准备数据库

```sql
CREATE DATABASE bishe_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

复制 `server/.env.example` 为 `server/.env`，填写 `DATABASE_URL` 与 `JWT_SECRET`。
注意：密码中的特殊字符需要 URL 编码，例如 `@` 写成 `%40`。

### 2. 安装依赖与初始化数据

```bash
npm install
npm --prefix server install
npm --prefix server run db:push
npm --prefix server run db:seed
```

### 3. 启动前后端（两个终端）

```bash
# 终端 1：后端，默认 3100 端口
npm run server

# 终端 2：前端
npm run dev
```

前端通过 Vite 代理把 `/api` 转发到 `http://localhost:3100`，无需额外配置跨域。

### 演示账号（密码均为 `123456`）

| 角色 | 邮箱 | 演示场景 |
| --- | --- | --- |
| 学生 | student@demo.edu | 答辩阶段，成绩已发布，可直接签名并归档 |
| 学生 | student2@demo.edu | 开题报告已提交，等待导师批阅 |
| 学生 | student3@demo.edu | 任务书已下达，等待学生确认 |
| 学生 | student4@demo.edu | 已归档 + 校级优秀论文 |
| 学生 | student5@demo.edu | 中期材料逾期，看板高风险 |
| 学生 | student6@demo.edu | 答辩完成，待导师签名 |
| 学生 | student7@demo.edu | 课题申请待审核 |
| 学生 | student8@demo.edu | 同课题第二人申请，可验证名额与多项目 |
| 导师 | advisor@demo.edu | 张明，待审核申请 + 待批阅里程碑 |
| 导师 | advisor2@demo.edu | 李静，盲审任务 + 待审核申请 |
| 导师 | advisor3@demo.edu | 王海，设备故障预测项目 |
| 教务 | admin@demo.edu | 全局看板、盲审抽检、优秀论文、归档 |

`npm --prefix server run db:seed` 会重建上述数据，并在 `server/uploads/seed` 写入论文、开题与中期等演示文件。

## 已实现能力

- 登录注册、JWT 鉴权、三角色路由守卫
- 课题发布（导师/教务）、学生申请、导师审核
- 审核通过后自动立项，并生成开题 / 中期 / 答辩三个默认里程碑
- 项目阶段状态机（选题 → 开题 → 中期 → 答辩 → 归档，只能逐级推进）
- 里程碑提交与导师批阅
- 文档上传、同名文件版本累加与下载
- 文档解析（PDF / DOCX / MD / TXT 自动提取文本与字数，支持重新解析与全文预览）
- 可信时间戳（归档时申请 RFC 3161 时间戳令牌，可下载 `.tsr` 并校验摘要）
- 站内通知中心（未读徽标、筛选、单条已读、全部已读、独立页面）
- 进度风险评分（逾期 / 完成度 / 临近截止 / 批阅等待四因子加权，可解释）
- 数据看板（阶段分布、风险分布、导师负载、高风险 Top 5）
- 任务书（导师下达、学生确认、重新下达）
- 指导记录（学生每周提交、导师逐条反馈）
- 评阅与答辩成绩（导师 30% + 评阅 30% + 答辩 40%，自动总评与等级）
- 查重率与答辩安排（分组、地点、时间）
- 合规检查（任务书 / 指导次数 / 开题 / 中期 / 论文 / 查重六项规则）
- 成绩发布与成绩单导出
- 电子签章（学生 / 导师 / 教务手写签名）
- 项目归档（成绩发布 + 双签后生成可打印 HTML 归档件，附带 SHA-256 摘要与完整性校验）
- 对象存储（阿里云 OSS，未配置自动回退本地磁盘）
- AI 辅助（千问 / DeepSeek 生成指导反馈、优秀论文评语与合规改进建议）
- AI 助教（右下角悬浮球 + 抽屉对话，未配置 Key 时使用内置规则回答）
- 粒子光效背景（登录页极光与浮动光球 + 全站闪烁粒子、鼠标连线与环境光）
- 项目专属箭头指针（玉青描边与琥珀点缀，悬停 `OPEN`、文本 I 型、加载 `LOADING`、左/右/中键与拖拽状态，仅桌面端）
- 抽屉式全局搜索（`Ctrl / Cmd + K`）
- 安全加固（安全响应头、登录/注册/AI 限流、优雅退出）
- 看板质量抽检面板（盲审任务、提交进度与优秀论文统计）
- 盲审抽检（随机抽取、匿名编号、自动分配非本人导师、匿名评阅与统计）
- 优秀论文评选（总评 / 查重 / 合规三项规则判定，校级 / 院级授予与展示）
- 邮件通知（配置 SMTP 后自动随站内通知发送）
- 用户管理（账号创建、启用/停用、重置密码，停用即禁止登录）
- 审计日志（申请、批阅、用户、催办等关键操作留痕）
- 数据导出（项目汇总 / 申请明细 CSV，Excel 可直接打开）
- 批量催办（多选项目向学生发送进度提醒）
- 全局搜索（`Ctrl / Cmd + K`，按角色检索课题、项目、用户）
- 自助修改密码
- 分页、搜索、空状态与加载态

## 可选外部服务

在 `server/.env` 填写后自动启用，未配置时不影响主流程：

- 阿里云 OSS：`OSS_REGION` / `OSS_BUCKET` / `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`
- 千问 / DeepSeek：`QWEN_API_KEY` 或 `DEEPSEEK_API_KEY`，用 `AI_PROVIDER` 选择
- SMTP 邮件：`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`

完整变量见 `server/.env.example`。

## 质量门禁

```bash
npm run lint            # ESLint（--max-warnings 0）
npm run test:unit       # 前端组件与逻辑测试（Vitest + jsdom，16 个用例）
npm test                # 后端测试（39 个用例：27 个纯函数 + 12 个 HTTP 层接口）
npm run test:e2e        # Playwright 三浏览器 E2E（Chromium / Firefox / WebKit，9 个用例）
npm run test:concurrency # 并发名额 / 一人一项目 + 只读接口压测
npm run build           # 生产构建
```

`server/` 暂未纳入 ESLint 范围，后续可选补充。

## 演示数据

```bash
npm --prefix server run db:seed   # 初始化 12 个账号、6 个项目、9 条申请与全流程演示数据，结束自动自检
npm run db:check                  # 也可单独复查 15 张表的记录数与种子文档文件
```

`db:check` 会逐表打印计数，并检查 8 份种子文档是否落盘；任一表为空或文件缺失时以非 0 退出。成绩、签章、归档、盲审、优秀论文等表只覆盖已进入对应阶段的项目，记录数少是业务阶段决定的，不代表数据缺失。

如果只恢复了数据库备份而没有 `server/uploads` 文件，文档下载会返回 404，重新执行 `db:seed` 即可同时补齐数据与种子文件。

## Docker 部署

先在项目根目录创建 `.env`（或在当前 shell 中导出变量），两个变量均为必填，未设置时 compose 会直接报错而不会使用公开默认值：

```bash
MYSQL_ROOT_PASSWORD=请替换为强密码
JWT_SECRET=请替换为随机长字符串
```

```bash
docker compose up -d --build
# 前端：http://localhost:8080
# 后端：http://localhost:3100/api/health
# 演示数据（首次可选）：
docker compose exec server npm run db:seed
```

`server` 容器启动时执行 `prisma db push` 仅用于比赛演示的初始化；生产环境请改用 `prisma migrate deploy` 管理数据库迁移。

## 相关文档

- [接口清单](docs/api.md)
- [项目架构](docs/architecture.md)
- [测试报告](docs/test-report.md)
- [外部接口对接清单](docs/integration-guide.md)
- [通用组件清单](docs/components.md)
- [竞赛差距清单与改造方案](docs/4c-competition-plan.md)

## 界面说明

全站视觉基于自定义设计系统 **Ink & Jade**：深墨绿侧边栏、米白纸面、玉青色强调色，Element Plus 主题变量统一覆盖；设计 Token 集中在 `src/style.css`，页面按 `page-head / toolbar / panel` 三段式组织。

Element Plus 通过 `unplugin-vue-components` 按需引入，构建产物主 JS 约 169KB（gzip 59.8KB）、主 CSS 约 62KB（gzip 11.9KB），相比整包引入体积下降约 85%。

体验层包含：登录页粒子光效、极光与浮动光球，全站闪烁粒子与鼠标连线，项目专属箭头指针（玉青描边、悬停 / 文本 / 加载 / 左中右键状态），路由切换进度条与页面转场、启动加载屏、数字滚动、统一空状态、404 / 403 / 500 错误页、AI 悬浮球与抽屉式全局搜索，并兼容 `prefers-reduced-motion`。
