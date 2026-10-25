# 外部接口对接清单

> 目标：区分「系统已内置」和「需要你提供外部服务」的部分，按优先级可直接对接。

## 一、已内置，无需对接

| 能力 | 实现 | 说明 |
| --- | --- | --- |
| 登录鉴权 | JWT + RBAC | 学生 / 导师 / 教务三角色 |
| 数据存储 | MySQL + Prisma | 本地已跑通，部署时换连接串 |
| 文件上传 | Multer + 阿里云 OSS | 10MB、类型白名单、版本累加；未配置 OSS 时回退本地磁盘 |
| 站内通知 | 通知表 + 轮询 | 申请、批阅、催办、成绩、归档 |
| 邮件通知 | Nodemailer（SMTP） | 填 `SMTP_*` 即生效，未配置自动跳过 |
| 电子签名 | Canvas 手写 + 签章表 | 学生/导师/教务三类签名 |
| 归档 | HTML 快照 + SHA-256 摘要 | 归档后锁定项目，支持完整性校验 |
| AI 辅助 | 千问 / DeepSeek | 评语、指导反馈、合规建议；填 Key 即生效 |
| CSV 导出 | 服务端生成 | 项目、申请、成绩 |

## 二、需要你对接的外部接口

### 1. 邮件 SMTP（必做，成本最低）

在 `server/.env` 填写：

```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@your-school.edu
SMTP_PASS=授权码
SMTP_FROM=毕设通 <no-reply@your-school.edu>
```

- 配置后，所有站内通知会自动同步发邮件，无需改代码。
- 测试：教务登录后 `POST /api/mail/test`，或页面上接入“发送测试邮件”按钮。
- 状态：`GET /api/mail/status` 返回 `{ enabled }`。
- 建议：QQ 邮箱用授权码；企业微信/腾讯企业邮同理；发送频率做队列，避免触发限流。

**个人最快方案（QQ 邮箱，约 5 分钟）**

1. 登录 `mail.qq.com` → 设置 → 账号与安全 → 安全设置；
2. 开启 POP3/IMAP/SMTP 服务；
3. 按提示验证后生成 16 位授权码；
4. 填入 `server/.env`：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的QQ邮箱
SMTP_PASS=授权码
SMTP_FROM="毕设通 <你的QQ邮箱>"
```

授权码不是 QQ 密码。学校/企业邮箱则使用对应后台的“客户端专用密码”。

演示环境可额外设置 `MAIL_OVERRIDE_TO=你的邮箱`，把所有通知邮件统一重定向到该地址，避免发往不存在的 `@demo.edu` 演示邮箱。

### 2. 统一身份认证（强烈建议）

学校一般提供 CAS / OAuth2 / 统一认证网关。

| 项 | 需要你提供 |
| --- | --- |
| 协议 | CAS 2.0 / OAuth2 / OIDC / 学校自建 |
| 入口 | 登录跳转地址、回调地址、登出地址 |
| 参数 | client_id、client_secret、scope |
| 返回字段 | 学号/工号、姓名、角色、院系、邮箱 |

对接位置：`server/src/routes/auth.routes.js` 的登录逻辑，前端 `LoginView` 增加“统一身份认证登录”按钮。
建议保留账号密码登录作为兜底。

### 3. 教务系统数据同步（建议）

需要同步：学生、导师、专业/院系、课题、成绩回写。

| 接口 | 方法 | 关键字段 |
| --- | --- | --- |
| 学生列表 | GET | studentNo, name, department, email |
| 教师列表 | GET | teacherNo, name, department, email |
| 成绩回写 | POST | studentNo, courseCode, score, level |

对接位置：新增 `server/src/routes/sync.routes.js`，用定时任务或管理端手动触发。
注意：以学号/工号作为唯一键，不要用姓名。

### 4. 论文查重（可选，亮点）

维普 / 知网 / 万方均提供检测 API，通常需要机构账号。

| 步骤 | 说明 |
| --- | --- |
| 提交 | 上传论文文件或文本，返回 taskId |
| 轮询 | 按 taskId 查询进度与状态 |
| 结果 | 总文字复制比、去除本人复制比、报告 URL、检测时间 |

当前系统已在 `Grade.plagiarismRate` 中预留查重率字段，并纳入合规检查（≤30%）。
对接后建议：
- 新增 `PlagiarismTask` 表记录 taskId/状态/报告地址；
- 学生上传论文后自动提交，回调或轮询写回 `plagiarismRate`；
- 页面在“评阅与成绩”中显示检测报告链接。

盲审抽检与优秀论文评选已内置，无需外部接口；查重结果回写 `plagiarismRate` 后会自动参与合规检查与优秀论文资格判定。

**可申请的官方/机构渠道**

| 渠道 | 入口 | 说明 |
| --- | --- | --- |
| 万方检测 API | <https://check.wanfangdata.com.cn/api/> | 文档最完整，创建机构账号后可调用认证、检测与结果接口 |
| 万方开放平台 | <https://ai.wfdata.com/> | 登录后自助创建 APPKEY，部分接口可在线试用 |
| 维普 VGMS | <https://vgms.fanyu.com/> | 面向高校提供开放接口，需学校账号开通 |
| 大雅（超星） | <https://www.dayainfo.com/> | 机构账号可批量检测，通过“联系我们”申请试用 |
| 知网 | 各地知网分公司 | 一般只对机构签约，无公开自助 API |

个人身份通常拿不到接口，最现实的路径是让学校图书馆 / 教务处用机构账号开通试用，再拿到 AppKey 或账号密码。

**个人身份可行性结论（2026-10 核实）**

- 万方开放平台支持个人开发者注册并创建 APPKEY，但《万方检测 API》文档明确要求“创建机构账号”后才能调用检测接口。
- 维普、大雅、知网的检测 API 主要面向高校/机构；个人可购买按篇检测，但通常没有 API。
- 因此比赛演示建议：保留 `plagiarismRate` 人工录入，允许上传检测报告 PDF 作为佐证，不要声称已经接入官方查重 API。
- 如果学校能提供机构账号，再按上面的 `PlagiarismTask` 方案正式对接。

### 5. 对象存储（已实现，填 Key 即可）

生产建议阿里云 OSS / 腾讯云 COS / MinIO；当前已内置阿里云 OSS 适配，未配置时自动回退 `server/uploads`。

在 `server/.env` 填写：

```env
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
# 可选
OSS_ENDPOINT=
OSS_PREFIX=bishe
```

上传逻辑位于 `server/src/services/storage.service.js`：配置了 OSS 就走 `ali-oss`，否则写本地磁盘；`Document.filePath` 只保存内部引用（`oss:<key>` 或 `/uploads/...`），**不会生成公网直链**。Bucket 必须保持**私有读**，下载一律经 `/api/.../download` 鉴权后由服务端读取转发。归档 HTML 中的签名是 Base64 内嵌，不受影响。

**个人获取方式**

1. 注册阿里云账号并完成个人实名认证；
2. 开通对象存储 OSS，创建 Bucket（选择离学校近的地域）；
3. 在 AccessKey 管理中创建 AccessKey，建议使用 RAM 子账号并只授予该 Bucket 的读写权限；
4. 把 Region、Bucket、AccessKey 填入 `server/.env`。

新用户通常有 20GB 标准存储、2GB 外网流出流量和 20 万次请求的 3 个月免费额度，具体以当期活动页为准。存放真实学生论文时 Bucket 必须设为私有读（本系统已不依赖公共读，也无需 CDN 直链）。

### 6. 电子签章 CA（可选，法律效力）

当前已实现“手写签名 + SHA-256 内容摘要 + 完整性校验”：

- 归档时对 HTML 归档件计算 SHA-256 并写入 `Archive.digest`；
- `GET /api/projects/:id/archive/verify` 重新计算并比对，返回 `valid`；
- 前端“签章归档”页可一键校验，摘要被改动会提示不一致。

如需法律效力，再对接 CA：

| 项 | 说明 |
| --- | --- |
| 供应商 | e签宝、法大大、上上签、学校 CA |
| 接口 | 创建签署任务、获取签署链接、回调签署状态、下载带签 PDF |
| 关键字段 | 姓名、证件号、手机号、文件、签署位置、时间戳 |

对接位置：`Signature` 表增加 `providerTaskId`、`certSerial`、`signedFileUrl`；
归档时优先使用 CA 返回的签名文件与验签报告。
建议保留当前手写签 + 摘要校验作为降级方案。

**个人身份可行性结论**

e签宝开放平台明确“仅对企业客户开放”，需要完成企业实名认证（对公打款）；法大大同样要求企业/组织主体、实名认证并申请开发者权限。个人开发者无法直接获得可用的 CA 签章 API。

因此：
- 比赛演示继续使用现有“手写签名 + SHA-256 摘要 + 完整性校验”，这是可讲清楚的可信归档方案；
- 如果学校有 CA 或合同平台，用学校主体申请沙箱，再把 `Signature` 的 `providerTaskId`、`certSerial`、`signedFileUrl` 接上；
- 不要把自建手写签名描述为“具备法律效力的 CA 签章”。

### 6.1 可信时间戳（已实现）

归档时会自动向 `TSA_URL` 申请 RFC 3161 时间戳令牌，默认使用 DigiCert 公共 TSA：

```env
TSA_URL="http://timestamp.digicert.com"
```

- 归档件生成后自动申请，失败不阻塞归档，只记录警告；
- `GET /api/projects/:id/archive/verify` 会同时校验归档 SHA-256 与时间戳 `messageImprint`；
- `GET /api/projects/:id/archive/timestamp` 可下载 `.tsr` 凭证；
- 当前校验覆盖令牌状态与摘要一致性；如需司法级验签，可用 `openssl ts -verify` 配合 TSA 根证书对 `.tsr` 做证书链验证。

### 7. 短信通知（可选）

需要：短信服务商（阿里云/腾讯云）、模板 ID、签名。
触发点：成绩发布、归档完成、逾期催办。
当前站内通知 + 邮件已覆盖主流程，短信作为增强。

### 8. AI 能力（已实现，填 Key 即可）

已内置千问与 DeepSeek 两个 OpenAI 兼容渠道，在 `server/.env` 填写：

```env
# qwen | deepseek，留空自动选择已配置的一方
AI_PROVIDER=qwen
QWEN_API_KEY=
QWEN_MODEL=qwen-plus
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

已接入的场景：

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| AI 助教对话 | 右下角 AI 悬浮球 | 流程与规则问答；未配置 Key 时用内置规则回答 |
| 指导反馈草稿 | 指导记录 → 回复 → AI 生成反馈草稿 | 根据学生本周进展生成 80—120 字反馈 |
| 优秀论文评语 | 论文评选 → 评选弹窗 → AI 生成评语 | 结合总评、查重与合规分生成 60—100 字评语 |
| 合规改进建议 | 评阅成绩 → 合规检查 → AI 建议 | 针对未通过项给出 3 条优先建议 |

接口：`GET /api/ai/status`、`POST /api/ai/chat`、`POST /api/ai/assist`。
未配置 Key 时接口返回 503，页面提示配置方式，不影响其他功能。
建议：所有 AI 输出必须“可解释 + 可人工覆盖”，不要把 AI 结论直接作为成绩。

## 三、推荐对接顺序

1. SMTP 邮件（当天可完成）
2. 对象存储（部署前）
3. 统一身份认证（上线前）
4. 教务系统同步（试点院系）
5. 查重 / CA 签章 / 短信（按学校资源）

## 四、验收清单

- [ ] 邮件：申请通过、批阅、成绩发布、归档四类通知能收到邮件
- [ ] 认证：统一认证登录后角色与院系正确
- [ ] 同步：学生/导师数据与教务一致，学号唯一
- [ ] 存储：配置 OSS 后上传文件可从公网访问，权限受控
- [ ] 查重：检测结果回写并参与合规检查
- [ ] 签章：归档件包含签名、时间与 SHA-256 摘要校验
- [ ] AI：评语、指导反馈、合规建议可生成且可人工修改
- [ ] 安全：密钥只放环境变量，不进代码仓库
