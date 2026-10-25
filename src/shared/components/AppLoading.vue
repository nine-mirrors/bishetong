<script setup>
// ── 应用启动加载 ──
defineProps({
  message: { type: String, default: '正在加载资源' },
})
</script>

<template>
  <div class="boot">
    <div class="boot-grid" aria-hidden="true" />

    <div class="boot-card">
      <div class="mark">
        <span class="mark-letter">T</span>
      </div>
      <p class="boot-brand">THESIS OS</p>
      <h1 class="boot-title">毕设通</h1>
      <p class="boot-message">{{ message }}</p>

      <div class="boot-track">
        <span class="boot-bar" />
      </div>

      <p class="boot-meta">GRADUATION PROJECT OPERATING SYSTEM</p>
    </div>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 70% 20%, rgba(14, 122, 99, 0.18), transparent 45%),
    var(--ink-900);
  color: #e8efeb;
  overflow: hidden;
}

.boot-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(232, 239, 235, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 239, 235, 0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse at 50% 45%, #000 30%, transparent 78%);
}

.boot-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: boot-in 0.5s ease both;
}

.mark {
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(123, 211, 182, 0.45);
  border-radius: 4px;
}

.mark::before {
  content: '';
  position: absolute;
  inset: -7px;
  border: 1px solid transparent;
  border-top-color: var(--jade-300);
  border-radius: 6px;
  animation: spin 1.15s linear infinite;
}

.mark-letter {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 600;
  color: var(--jade-300);
}

.boot-brand {
  margin: 22px 0 0;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.3em;
  color: rgba(232, 239, 235, 0.4);
}

.boot-title {
  margin: 10px 0 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.boot-message {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(232, 239, 235, 0.5);
}

.boot-track {
  width: 190px;
  height: 2px;
  margin-top: 26px;
  background: rgba(232, 239, 235, 0.12);
  overflow: hidden;
  border-radius: 1px;
}

.boot-bar {
  display: block;
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--jade-300), transparent);
  animation: slide 1.2s ease-in-out infinite;
}

.boot-meta {
  margin: 26px 0 0;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.24em;
  color: rgba(232, 239, 235, 0.22);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slide {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(340%);
  }
}

@keyframes boot-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
