<script setup>
// ── 顶部路由进度条 ──
import { progressState } from '@/app/progress.js'
</script>

<template>
  <div class="route-progress" :class="{ active: progressState.active }">
    <span class="route-bar" :style="{ width: `${progressState.value}%` }" />
  </div>
</template>

<style scoped>
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 9998;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.24s ease;
}

.route-progress.active {
  opacity: 1;
}

.route-bar {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--jade-500), var(--jade-300), var(--amber-600));
  box-shadow: 0 0 12px rgba(123, 211, 182, 0.55);
  transition: width 0.2s ease;
}
</style>
