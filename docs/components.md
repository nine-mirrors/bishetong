# 通用组件清单

> 规范依据：CLAUDE.md §2.4 — 所有通用组件必须在本文档登记。

| 组件 | 路径 | 用途 | Props | Emits |
|------|------|------|-------|-------|
| AppLoading | `@/shared/components/AppLoading.vue` | 启动加载屏，等待路由就绪 | `message: String` | — |
| RouteProgress | `@/shared/components/RouteProgress.vue` | 顶部路由切换进度条 | — | — |
| AnimatedNumber | `@/shared/components/AnimatedNumber.vue` | 数字滚动动画 | `value: Number`, `duration: Number`, `decimals: Number` | — |
| EmptyState | `@/shared/components/EmptyState.vue` | 统一空状态，可选操作按钮 | `title: String`, `description: String`, `actionText: String` | `action` |
| ParticleField | `@/shared/components/ParticleField.vue` | Canvas 粒子光效背景，支持明暗主题、邻近连线、鼠标微交互 | `variant: 'light' \| 'dark'`, `density: Number`, `linkDistance: Number`, `interactive: Boolean`, `speed: Number` | — |
| AiCopilot | `@/shared/components/AiCopilot.vue` | AI 悬浮球 + 抽屉式对话，含快捷问题、输入中状态与本地规则兜底 | — | — |
| CustomCursor | `@/shared/components/CustomCursor.vue` | 项目专属箭头指针：原生箭头造型 + 玉青描边 + 琥珀点缀 + 状态标签，支持悬停、文本、加载、左/右/中键、拖拽与禁用状态 | — | — |
| SignaturePad | `@/features/project/components/SignaturePad.vue` | 手写电子签名画板 | — | `change` |

## 交互约定

- `ParticleField` 使用持续动画循环，登录页与全站背景粒子独立漂移、闪烁并动态连线；系统开启“减少动态效果”时仅关闭平滑滚动，粒子仍保持自运动。
- `CustomCursor` 只在 `(pointer: fine)` 设备启用，仅在应用内覆盖系统指针；箭头悬停链接/按钮时轻微放大并显示 `OPEN`，输入框切换为 I 型光标，页面或按钮加载时显示旋转轨道与 `LOADING`，左/右/中键分别显示 `CLICK` / `R-CLICK` / `M-CLICK` 与对应颜色涟漪；指针层传送到 `body` 并置于 Element Plus 弹层之上。
- `AiCopilot` 挂在 `MainLayout`，所有登录角色可见；未配置 AI Key 时使用内置规则回答，并在气泡上标注 `LOCAL`。
- 抽屉类交互统一从右侧进入：AI 助教 420px、全局搜索 460px。

## 变更记录

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2026-06-29 | v0.1.0 | 初始登记，含 4 个 todo 模块组件 |
| 2026-10-23 | v1.1.0 | 补充通用组件，新增 ParticleField 与 AiCopilot |
| 2026-10-23 | v1.2.0 | 新增 CustomCursor 专属鼠标指针 |
| 2026-10-23 | v1.3.0 | 指针改为箭头造型并补充加载、左/右/中键与拖拽状态 |
| 2026-10-23 | v1.4.0 | 移除早期 todo 示例组件，仅保留业务通用组件 |
