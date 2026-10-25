<script setup>
// ── 错误页：404 / 403 / 500 ──
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const code = computed(() => {
  if (route.query.code) return String(route.query.code)
  return route.name === 'NotFound' ? '404' : '500'
})

const titles = {
  403: '没有访问权限',
  404: '页面不存在',
  500: '系统开了个小差',
}

const title = computed(() => titles[code.value] || '页面出了点问题')

const description = computed(() => {
  if (route.query.message) return String(route.query.message)
  if (code.value === '404') return '你访问的地址可能已被移动或删除，请检查链接后重试。'
  if (code.value === '403') return '当前账号没有访问该资源的权限，如有疑问请联系教务。'
  return '请求没有顺利完成，可以稍后重试，或返回工作台继续操作。'
})

const metric = computed(() => {
  if (code.value === '404') return 'SYS / PAGE_NOT_FOUND'
  if (code.value === '403') return 'SYS / ACCESS_DENIED'
  return 'SYS / INTERNAL_ERROR'
})

function goHome() {
  router.push(auth.isLoggedIn ? '/topics' : '/login')
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  goHome()
}
</script>

<template>
  <div class="error-page">
    <div class="grid" aria-hidden="true" />
    <div class="glow glow-jade" aria-hidden="true" />
    <div class="glow glow-amber" aria-hidden="true" />

    <header class="top">
      <button type="button" class="brand" @click="goHome">
        <span class="brand-mark">T</span>
        <span class="brand-copy">
          <strong>毕设通</strong>
          <span>THESIS OS</span>
        </span>
      </button>
      <span class="top-meta num">{{ metric }}</span>
    </header>

    <main class="body">
      <div class="code-block">
        <span class="code">{{ code }}</span>
        <span class="code-line" />
      </div>

      <div class="copy">
        <p class="eyebrow">REQUEST INTERRUPTED</p>
        <h1 class="title">{{ title }}</h1>
        <p class="desc">{{ description }}</p>

        <div class="actions">
          <el-button type="primary" @click="goHome">
            {{ auth.isLoggedIn ? '返回工作台' : '去登录' }}
          </el-button>
          <el-button @click="goBack">返回上一页</el-button>
        </div>

        <p class="hint num">ERROR CODE {{ code }} · 如持续出现请联系系统管理员</p>
      </div>
    </main>

    <footer class="foot">
      <span>THESIS OS</span>
      <span class="dot" />
      <span>毕业设计全流程管理</span>
    </footer>
  </div>
</template>

<style scoped>
.error-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 32px 48px 26px;
  overflow: hidden;
  background: var(--paper);
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(11, 21, 18, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 21, 18, 0.045) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse at 55% 45%, #000 25%, transparent 80%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
}

.glow-jade {
  width: 440px;
  height: 440px;
  top: -140px;
  right: -80px;
  background: rgba(14, 122, 99, 0.16);
  animation: drift 14s ease-in-out infinite alternate;
}

.glow-amber {
  width: 360px;
  height: 360px;
  bottom: -160px;
  left: -60px;
  background: rgba(169, 106, 11, 0.12);
  animation: drift 18s 1s ease-in-out infinite alternate-reverse;
}

.top,
.body,
.foot {
  position: relative;
  z-index: 1;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--ink-900);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.brand-copy strong {
  font-size: 13px;
  letter-spacing: 0.08em;
}

.brand-copy span {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.22em;
  color: var(--text-faint);
}

.top-meta {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
  align-items: center;
  gap: 48px;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
}

.code-block {
  position: relative;
  display: flex;
  flex-direction: column;
  animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.code {
  font-family: var(--font-mono);
  font-size: clamp(120px, 17vw, 240px);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(11, 21, 18, 0.32);
}

.code-line {
  width: 64px;
  height: 2px;
  margin-top: 20px;
  background: var(--jade-600);
}

.copy {
  max-width: 460px;
  animation: rise 0.7s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.title {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 40px);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.desc {
  margin: 16px 0 0;
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.hint {
  margin: 24px 0 0;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.18em;
  color: var(--text-faint);
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }

  to {
    transform: translate3d(-36px, 42px, 0) scale(1.12);
  }
}

@media (max-width: 860px) {
  .error-page {
    padding: 24px 20px 20px;
  }

  .body {
    grid-template-columns: 1fr;
    gap: 28px;
    align-content: center;
  }

  .code {
    font-size: 110px;
  }

  .copy {
    max-width: none;
  }
}
</style>
