<template>
  <div>
    <button
      type="button"
      class="ai-fab"
      :class="{ open: visible }"
      aria-label="AI 助教"
      @click="openCopilot"
    >
      <span class="fab-ring" aria-hidden="true" />
      <el-icon class="fab-icon"><ChatDotRound /></el-icon>
      <span class="fab-label">AI 助教</span>
      <span class="fab-status" :class="{ on: status.enabled }" />
    </button>

    <el-drawer
      v-model="visible"
      direction="rtl"
      size="420px"
      :with-header="false"
      append-to-body
      class="ai-drawer"
    >
      <div class="copilot">
        <header class="copilot-head">
          <div class="head-brand">
            <span class="head-mark">AI</span>
            <div class="head-copy">
              <strong>毕设通助教</strong>
              <span class="head-sub num">{{ status.enabled ? 'AI ONLINE' : 'LOCAL HELP' }}</span>
            </div>
          </div>
          <div class="head-actions">
            <button type="button" class="ghost-btn" @click="clearChat">清空</button>
            <button type="button" class="ghost-btn" @click="visible = false">关闭</button>
          </div>
        </header>

        <div ref="bodyRef" class="copilot-body">
          <div v-for="item in messages" :key="item.id" class="msg" :class="item.role">
            <span v-if="item.role === 'assistant'" class="msg-avatar">AI</span>
            <div class="bubble">
              <p class="bubble-text">{{ item.content }}</p>
              <span v-if="item.source" class="bubble-source num">{{ item.source }}</span>
            </div>
          </div>

          <div v-if="typing" class="msg assistant">
            <span class="msg-avatar">AI</span>
            <div class="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        </div>

        <div class="quick-row">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="quick-chip"
            @click="send(prompt)"
          >
            {{ prompt }}
          </button>
        </div>

        <footer class="copilot-foot">
          <textarea
            v-model="draft"
            class="chat-input"
            rows="2"
            maxlength="500"
            placeholder="问我流程、规则，或让我帮你起草内容…"
            @keydown.enter.exact.prevent="send()"
          />
          <button type="button" class="send-btn" :disabled="!draft.trim() || typing" @click="send()">
            发送
          </button>
        </footer>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
// ── AI 悬浮球 + 抽屉式对话 ──
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound } from '@element-plus/icons-vue'
import { aiChat, fetchAiStatus } from '@/shared/api/ai.js'
import { useAuthStore } from '@/stores/auth.js'
import { titleFor } from '@/app/pageTitles.js'

const auth = useAuthStore()
const route = useRoute()

const visible = ref(false)
const typing = ref(false)
const draft = ref('')
const bodyRef = ref(null)
const status = ref({ enabled: false, defaultProvider: null })
const messages = ref([])
const STORAGE_KEY = 'bishe_ai_chat'

const welcome = computed(() => {
  const base = '你好，我是毕设通助教。可以问我流程与规则，也可以让我帮你起草指导反馈、评语或合规建议。'
  return status.value.enabled
    ? base
    : `${base}\n当前未配置 AI Key，我会用内置规则回答；配置后可进行自由对话。`
})

const quickPrompts = computed(() => {
  if (auth.isAdmin) {
    return ['盲审抽检怎么抽', '优秀论文评选条件', '归档需要哪些条件']
  }
  if (auth.isAdvisor) {
    return ['怎么写好指导反馈', '盲审评阅要注意什么', '优秀论文评选条件']
  }
  return ['毕业设计各阶段要做什么', '合规检查看哪些项', '归档流程是什么']
})

const HELP_RULES = [
  {
    keys: ['盲审', '抽检'],
    content:
      '盲审抽检：成绩发布后，教务从“已发布且未抽检”的项目中随机抽取 1—20 篇，生成匿名编号 BR-年份-序号，并自动分配给非本人导师。评阅教师只能看到项目标题和材料，看不到学生与导师信息；提交评分与意见后，教务可查看总量、待评阅和平均分。',
  },
  {
    keys: ['优秀论文', '评优', '评选'],
    content:
      '优秀论文评选条件：成绩已发布、总评 ≥85、查重率 ≤30%、合规分 ≥80。教务在「论文评选」中授予校级或院级，学生与导师会收到通知；撤销后候选资格恢复。',
  },
  {
    keys: ['归档', '签章', '签名'],
    content:
      '归档流程：学生、导师与教务先完成手写签名，成绩发布后由教务执行归档。系统会生成 HTML 归档件并写入 SHA-256 摘要，项目锁定为“已归档”；在「签章归档」页可以校验归档内容是否被改动。',
  },
  {
    keys: ['查重', '重复率'],
    content:
      '系统已预留查重率字段，并纳入合规检查（≤30%）和优秀论文评选。真实查重需要接入学校机构账号的检测 API（如万方、维普、大雅）；结果回写后会自动参与规则计算。',
  },
  {
    keys: ['合规', '检查项'],
    content:
      '合规检查共 100 分：任务书已确认 20、指导记录 ≥6 次 20、开题通过 20、中期通过 20、论文/设计说明书 15、查重率 ≤30% 5。低于 80 分不建议进入归档。',
  },
  {
    keys: ['风险', '预警'],
    content:
      '进度风险由四个因子加权：里程碑逾期 35%、整体完成度 25%、临近截止 20%、批阅等待 20%。分数 0—100，≥60 高风险、≥30 中风险，并会给出可执行的改进建议。',
  },
  {
    keys: ['指导记录', '反馈'],
    content:
      '学生每周提交一次指导记录，导师逐条回复。指导记录会进入合规评分（≥6 次得满分），也是归档材料的一部分。导师可在回复弹窗中使用“AI 生成反馈草稿”再人工修改。',
  },
  {
    keys: ['阶段', '流程', '下一步'],
    content:
      '全流程：选题申请 → 导师审核立项 → 任务书下达与确认 → 每周指导记录 → 开题/中期里程碑 → 合规检查 → 评阅与答辩成绩 → 教务发布 → 学生/导师签名 → 教务归档 → 优秀论文评选。阶段只能逐级推进。',
  },
]

function localAnswer(question) {
  const hit = HELP_RULES.find((rule) => rule.keys.some((key) => question.includes(key)))
  if (hit) return { content: hit.content, matched: true }
  return {
    content:
      '当前未配置 AI Key，只能回答内置规则。你可以问我：盲审抽检、优秀论文、归档签章、合规检查、进度风险、指导记录或整体流程。配置 QWEN_API_KEY 或 DEEPSEEK_API_KEY 后即可自由对话。',
    matched: false,
  }
}

function restore() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    if (Array.isArray(cached) && cached.length) {
      messages.value = cached.slice(-30)
      return true
    }
  } catch {
    // 忽略损坏的缓存
  }
  return false
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-30)))
  } catch {
    // 存储不可用时忽略
  }
}

function push(message) {
  messages.value.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, ...message })
  persist()
  scrollToBottom()
}

function resetWelcome() {
  messages.value = [
    {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: welcome.value,
      source: status.value.enabled ? 'AI' : 'LOCAL',
    },
  ]
  persist()
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

async function loadStatus() {
  try {
    status.value = await fetchAiStatus()
  } catch {
    status.value = { enabled: false, defaultProvider: null }
  }
}

onMounted(async () => {
  await loadStatus()
  if (!restore()) resetWelcome()
})

async function openCopilot() {
  visible.value = true
  if (!messages.value.length) resetWelcome()
  scrollToBottom()
  loadStatus()
}

function clearChat() {
  resetWelcome()
}

async function send(preset) {
  const content = String(preset ?? draft.value).trim()
  if (!content || typing.value) return
  draft.value = ''
  push({ role: 'user', content })

  if (!status.value.enabled) {
    const local = localAnswer(content)
    push({ role: 'assistant', content: local.content, source: 'LOCAL' })
    return
  }

  typing.value = true
  scrollToBottom()
  try {
    const history = messages.value
      .filter((item) => item.source !== 'LOCAL')
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }))
    const result = await aiChat({
      messages: history,
      context: titleFor(route.name),
    })
    push({
      role: 'assistant',
      content: result.content,
      source: String(result.provider || 'AI').toUpperCase(),
    })
  } catch (error) {
    const local = localAnswer(content)
    if (local.matched || error.status === 503) {
      push({ role: 'assistant', content: local.content, source: 'LOCAL' })
    } else {
      push({ role: 'assistant', content: `AI 调用失败：${error.message}`, source: 'SYSTEM' })
    }
  } finally {
    typing.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 1800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid rgba(123, 211, 182, 0.35);
  border-radius: 999px;
  background: linear-gradient(150deg, #10201b, #0b1512 70%);
  color: var(--jade-200);
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(11, 21, 18, 0.32);
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1), transform 0.2s ease;
}

.ai-fab:hover {
  width: 138px;
  justify-content: flex-start;
  padding-left: 16px;
  gap: 10px;
  transform: translateY(-2px);
}

.fab-ring {
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  border: 1px solid rgba(123, 211, 182, 0.28);
  animation: fab-pulse 2.8s ease-out infinite;
  pointer-events: none;
}

.fab-icon {
  font-size: 22px;
  color: var(--jade-200);
  flex-shrink: 0;
}

.fab-label {
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: max-width 0.28s ease, opacity 0.2s ease;
}

.ai-fab:hover .fab-label {
  max-width: 86px;
  opacity: 1;
}

.fab-status {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--ink-900);
  background: var(--amber-500, #d99a2b);
}

.fab-status.on {
  background: var(--jade-300);
}

@keyframes fab-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }

  70% {
    transform: scale(1.18);
    opacity: 0;
  }

  100% {
    opacity: 0;
  }
}

.copilot {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--paper);
}

.copilot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background:
    radial-gradient(circle at 88% -20%, rgba(123, 211, 182, 0.22), transparent 60%),
    var(--ink-900);
  color: #e8efeb;
}

.head-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.head-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(123, 211, 182, 0.45);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--jade-200);
}

.head-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.head-copy strong {
  font-size: 14px;
  letter-spacing: 0.04em;
}

.head-sub {
  font-size: 8.5px;
  letter-spacing: 0.2em;
  color: rgba(232, 239, 235, 0.45);
}

.head-actions {
  display: flex;
  gap: 6px;
}

.ghost-btn {
  padding: 5px 8px;
  border: 1px solid rgba(232, 239, 235, 0.16);
  border-radius: 3px;
  background: transparent;
  font-size: 10.5px;
  color: rgba(232, 239, 235, 0.7);
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease;
}

.ghost-btn:hover {
  border-color: rgba(123, 211, 182, 0.5);
  color: #fff;
}

.copilot-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background-image: radial-gradient(circle at 1px 1px, rgba(11, 21, 18, 0.045) 1px, transparent 0);
  background-size: 22px 22px;
}

.msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 100%;
}

.msg.user {
  justify-content: flex-end;
}

.msg-avatar {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 3px;
  border: 1px solid var(--jade-300);
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--jade-700);
}

.bubble {
  max-width: 300px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 2px 10px 10px 10px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.msg.user .bubble {
  border-color: transparent;
  border-radius: 10px 2px 10px 10px;
  background: var(--ink-900);
  color: #e8efeb;
  box-shadow: 0 10px 22px rgba(11, 21, 18, 0.18);
}

.bubble-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  white-space: pre-line;
}

.bubble-source {
  display: block;
  margin-top: 6px;
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.msg.user .bubble-source {
  color: rgba(232, 239, 235, 0.4);
}

.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 14px;
}

.typing span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jade-500);
  animation: typing-bounce 1.1s ease-in-out infinite;
}

.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }

  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.quick-row {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  overflow-x: auto;
  border-top: 1px solid var(--line-soft);
  background: var(--paper);
}

.quick-chip {
  flex-shrink: 0;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 10.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
}

.quick-chip:hover {
  border-color: var(--jade-300);
  background: var(--jade-100);
  color: var(--jade-700);
}

.copilot-foot {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.chat-input {
  flex: 1;
  resize: none;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-soft);
  font-family: var(--font-sans);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.16s ease;
}

.chat-input:focus {
  border-color: var(--jade-300);
}

.send-btn {
  height: 38px;
  padding: 0 16px;
  border: 1px solid var(--ink-900);
  border-radius: 4px;
  background: var(--ink-900);
  font-size: 12px;
  color: #e8efeb;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease;
}

.send-btn:hover:not(:disabled) {
  background: var(--jade-700);
  border-color: var(--jade-700);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .ai-fab {
    right: 18px;
    bottom: 18px;
  }

  .ai-fab:hover {
    width: 56px;
    padding-left: 0;
    gap: 0;
  }

  .ai-fab:hover .fab-label {
    max-width: 0;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fab-ring {
    animation: none;
  }

  .typing span {
    animation: none;
  }
}
</style>

<style>
.ai-drawer .el-drawer__body {
  padding: 0;
  overflow: hidden;
}

.ai-drawer.el-drawer {
  max-width: 100%;
}
</style>
