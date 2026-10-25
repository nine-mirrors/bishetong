<script setup>
// ── 登录页 ──
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.js'
import ParticleField from '@/shared/components/ParticleField.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({ email: '', password: '' })

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const demoAccounts = [
  { role: '学生', code: 'STUDENT', email: 'student@demo.edu' },
  { role: '导师', code: 'ADVISOR', email: 'advisor@demo.edu' },
  { role: '导师 · 盲审', code: 'ADVISOR', email: 'advisor2@demo.edu' },
  { role: '教务', code: 'ADMIN', email: 'admin@demo.edu' },
]

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMessage.value = ''
  try {
    await auth.login({ email: form.email, password: form.password })
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' ? redirect : '/topics')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

function fillDemo(email) {
  form.email = email
  form.password = '123456'
  errorMessage.value = ''
}

// ── 学生注册 ──
const registerVisible = ref(false)
const registerRef = ref(null)
const registering = ref(false)
const registerForm = reactive({ name: '', email: '', password: '', studentNo: '', department: '' })

const registerRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

function openRegister() {
  registerVisible.value = true
}

async function submitRegister() {
  if (!registerRef.value) return
  const valid = await registerRef.value.validate().catch(() => false)
  if (!valid) return

  registering.value = true
  try {
    await auth.register({ ...registerForm })
    ElMessage.success('注册成功，已自动登录')
    registerVisible.value = false
    router.replace('/topics')
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    registering.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="brand-panel">
      <ParticleField class="login-particles" variant="dark" :density="0.00012" />
      <div class="aurora" aria-hidden="true" />
      <span class="orb orb-a" aria-hidden="true" />
      <span class="orb orb-b" aria-hidden="true" />
      <span class="orb orb-c" aria-hidden="true" />
      <div class="grid-lines" aria-hidden="true" />

      <header class="brand-top">
        <span class="brand-mark">T</span>
        <div class="brand-word">
          <strong>毕设通</strong>
          <span>THESIS OS</span>
        </div>
      </header>

      <div class="brand-main">
        <p class="eyebrow light">GRADUATION PROJECT OPERATING SYSTEM</p>
        <h1 class="brand-title">
          毕业设计<br />
          <em>全流程</em>管理
        </h1>
        <p class="brand-desc">
          从课题申请到答辩归档，把学生、导师、教务放进同一条进度线上。
          用可解释的风险评分替代事后催办。
        </p>

        <ul class="feature-list">
          <li>
            <span class="feature-index">01</span>
            <div>
              <strong>阶段推进</strong>
              <span>选题 · 开题 · 中期 · 答辩 · 归档，逐级流转</span>
            </div>
          </li>
          <li>
            <span class="feature-index">02</span>
            <div>
              <strong>里程碑协作</strong>
              <span>材料提交、导师批阅、版本与通知闭环</span>
            </div>
          </li>
          <li>
            <span class="feature-index">03</span>
            <div>
              <strong>风险预警</strong>
              <span>四因子加权，输出可解释的进度风险</span>
            </div>
          </li>
        </ul>
      </div>

      <footer class="brand-foot">
        <span>4C · 2027</span>
        <span class="dot" />
        <span>本科毕业设计</span>
      </footer>
    </section>

    <section class="form-panel">
      <div class="form-inner">
        <p class="eyebrow">SIGN IN</p>
        <h2 class="form-title">登录工作台</h2>
        <p class="form-sub">使用学校邮箱继续</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="login-form"
          @keyup.enter="handleSubmit"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="name@school.edu" autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="至少 6 位"
              autocomplete="current-password"
            />
          </el-form-item>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <el-button class="submit" type="primary" :loading="loading" @click="handleSubmit">
            登录
          </el-button>
        </el-form>

        <div class="switch">
          <span>还没有账号？</span>
          <el-button link type="primary" size="small" @click="openRegister">学生注册</el-button>
        </div>

        <div class="demo">
          <div class="demo-head">
            <span>DEMO ACCOUNTS</span>
            <span class="demo-hint">密码均为 123456</span>
          </div>
          <button
            v-for="item in demoAccounts"
            :key="item.email"
            type="button"
            class="demo-item"
            @click="fillDemo(item.email)"
          >
            <span class="demo-code">{{ item.code }}</span>
            <span class="demo-role">{{ item.role }}</span>
            <span class="demo-email">{{ item.email }}</span>
            <span class="demo-arrow">→</span>
          </button>
        </div>
      </div>

      <p class="form-foot">THESIS OS · 毕业设计全流程管理</p>
    </section>

    <el-dialog v-model="registerVisible" title="学生注册" width="480px">
      <el-form ref="registerRef" :model="registerForm" :rules="registerRules" label-position="top">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="registerForm.name" maxlength="20" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="name@school.edu" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="registerForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="学号">
          <el-input v-model="registerForm.studentNo" maxlength="20" />
        </el-form-item>
        <el-form-item label="学院">
          <el-input v-model="registerForm.department" maxlength="30" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">取消</el-button>
        <el-button type="primary" :loading="registering" @click="submitRegister">注册并登录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 540px;
}

/* ── 左侧品牌面板 ── */
.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 36px 56px 32px;
  background:
    radial-gradient(circle at 82% 8%, rgba(123, 211, 182, 0.16), transparent 42%),
    radial-gradient(circle at 12% 92%, rgba(14, 122, 99, 0.22), transparent 46%),
    var(--ink-900);
  color: #e8efeb;
  overflow: hidden;
}

.brand-panel::after {
  content: '';
  position: absolute;
  top: -140px;
  right: -120px;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123, 211, 182, 0.18), transparent 68%);
  filter: blur(30px);
  animation: drift 16s ease-in-out infinite alternate;
  pointer-events: none;
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(232, 239, 235, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 239, 235, 0.045) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse at 60% 40%, #000 40%, transparent 82%);
  pointer-events: none;
  overflow: hidden;
}

.login-particles {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.aurora {
  position: absolute;
  inset: -32%;
  z-index: 0;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(123, 211, 182, 0.12) 70deg,
    transparent 150deg,
    transparent 250deg,
    rgba(14, 122, 99, 0.16) 305deg,
    transparent 360deg
  );
  filter: blur(46px);
  opacity: 0.75;
  animation: aurora-spin 28s linear infinite;
  pointer-events: none;
}

@keyframes aurora-spin {
  to {
    transform: rotate(360deg);
  }
}

.orb {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(20px);
  opacity: 0.6;
  animation: orb-float 13s ease-in-out infinite alternate;
}

.orb-a {
  left: 10%;
  top: 58%;
  width: 190px;
  height: 190px;
  background: radial-gradient(circle, rgba(123, 211, 182, 0.22), transparent 70%);
}

.orb-b {
  right: 16%;
  top: 20%;
  width: 130px;
  height: 130px;
  background: radial-gradient(circle, rgba(14, 122, 99, 0.34), transparent 70%);
  animation-delay: -4.5s;
}

.orb-c {
  left: 56%;
  bottom: 10%;
  width: 90px;
  height: 90px;
  background: radial-gradient(circle, rgba(230, 255, 245, 0.18), transparent 70%);
  animation-delay: -8s;
}

@keyframes orb-float {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }

  to {
    transform: translate3d(20px, -28px, 0) scale(1.14);
  }
}

.grid-lines::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 140px;
  background: linear-gradient(180deg, transparent, rgba(123, 211, 182, 0.07), transparent);
  animation: scan 11s linear infinite;
}

@keyframes scan {
  from {
    top: -20%;
  }

  to {
    top: 110%;
  }
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }

  to {
    transform: translate3d(-46px, 54px, 0) scale(1.12);
  }
}

.brand-top,
.brand-main,
.brand-foot {
  position: relative;
  z-index: 1;
}

.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--jade-300);
  border-radius: 3px;
  color: var(--jade-300);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 600;
}

.brand-word {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-word strong {
  font-size: 14px;
  letter-spacing: 0.1em;
}

.brand-word span {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.24em;
  color: rgba(232, 239, 235, 0.4);
}

.brand-main {
  max-width: 560px;
}

.eyebrow.light {
  color: var(--jade-300);
}

.brand-title {
  margin: 0;
  font-size: clamp(40px, 4.6vw, 62px);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.brand-title em {
  font-style: normal;
  background: linear-gradient(100deg, #7bd3b6, #e6fff5 55%, #7bd3b6);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.brand-desc {
  max-width: 430px;
  margin: 22px 0 0;
  font-size: 13.5px;
  line-height: 1.9;
  color: rgba(232, 239, 235, 0.62);
}

.feature-list {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  border-top: 1px solid rgba(232, 239, 235, 0.12);
}

.feature-list li {
  display: flex;
  gap: 18px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(232, 239, 235, 0.12);
}

.feature-index {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(123, 211, 182, 0.7);
  padding-top: 3px;
}

.feature-list div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-list strong {
  font-size: 13.5px;
  font-weight: 600;
  color: #e8efeb;
}

.feature-list div span {
  font-size: 12px;
  color: rgba(232, 239, 235, 0.45);
}

.brand-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  color: rgba(232, 239, 235, 0.3);
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

/* ── 右侧表单 ── */
.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 64px;
  background: var(--paper);
  border-left: 1px solid var(--line);
}

.form-inner {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.form-title {
  margin: 0;
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.form-sub {
  margin: 8px 0 30px;
  font-size: 13px;
  color: var(--text-secondary);
}

.login-form :deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding-bottom: 6px;
}

.login-form :deep(.el-input__wrapper) {
  padding: 4px 12px;
  background: var(--surface);
}

.submit {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  --el-button-bg-color: var(--ink-900);
  --el-button-border-color: var(--ink-900);
  --el-button-hover-bg-color: var(--jade-700);
  --el-button-hover-border-color: var(--jade-700);
  --el-button-active-bg-color: var(--jade-700);
  letter-spacing: 0.04em;
}

.error {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--clay-600);
}

.switch {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.demo {
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.demo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  color: var(--text-faint);
}

.demo-hint {
  letter-spacing: 0;
  font-family: var(--font-sans);
  font-size: 11px;
}

.demo-item {
  display: grid;
  grid-template-columns: 64px 74px 1fr 16px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 11px 8px;
  border: none;
  border-bottom: 1px solid var(--line-soft);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, padding-left 0.16s ease;
}

.demo-item:hover {
  background: var(--surface);
  padding-left: 12px;
}

.demo-code {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--jade-600);
}

.demo-role {
  font-size: 12px;
  color: var(--text-primary);
}

.demo-email {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-arrow {
  font-size: 12px;
  color: var(--text-faint);
}

.form-foot {
  margin: 40px auto 0;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--text-faint);
}

/* ── 入场编排 ── */
.brand-top {
  animation: rise 0.6s 0.05s both;
}

.brand-main .eyebrow {
  animation: rise 0.6s 0.14s both;
}

.brand-title {
  animation: rise 0.7s 0.2s both;
}

.brand-desc {
  animation: rise 0.7s 0.28s both;
}

.feature-list li {
  animation: rise 0.6s both;
}

.feature-list li:nth-child(1) {
  animation-delay: 0.36s;
}

.feature-list li:nth-child(2) {
  animation-delay: 0.44s;
}

.feature-list li:nth-child(3) {
  animation-delay: 0.52s;
}

.brand-foot {
  animation: rise 0.6s 0.62s both;
}

.form-inner > .eyebrow {
  animation: rise 0.55s 0.12s both;
}

.form-title {
  animation: rise 0.6s 0.18s both;
}

.form-sub {
  animation: rise 0.6s 0.24s both;
}

.login-form {
  animation: rise 0.6s 0.3s both;
}

.switch {
  animation: rise 0.6s 0.36s both;
}

.demo {
  animation: rise 0.6s 0.42s both;
}

.form-foot {
  animation: fade 0.8s 0.5s both;
}

@keyframes fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    padding: 26px 24px 24px;
  }

  .brand-title {
    font-size: 36px;
  }

  .brand-desc {
    max-width: none;
    margin-top: 14px;
    font-size: 12.5px;
    line-height: 1.8;
  }

  .feature-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 18px;
    border-top: none;
  }

  .feature-list li {
    display: block;
    padding: 10px 12px;
    border: 1px solid rgba(232, 239, 235, 0.14);
    border-radius: 3px;
  }

  .feature-index {
    display: block;
    padding: 0 0 6px;
  }

  .feature-list div span {
    display: none;
  }

  .brand-foot {
    display: none;
  }

  .form-panel {
    padding: 32px 24px 48px;
    border-left: none;
    border-top: 1px solid var(--line);
  }
}

@media (max-width: 600px) {
  .brand-panel {
    padding: 20px 20px 22px;
  }

  .brand-title {
    font-size: 30px;
  }

  .brand-desc,
  .feature-list {
    display: none;
  }

  .form-panel {
    padding: 28px 20px 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aurora {
    animation-duration: 52s;
  }

  .orb {
    animation-duration: 26s;
  }
}
</style>
