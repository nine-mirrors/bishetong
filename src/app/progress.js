// ── 路由切换进度 ──
import { reactive } from 'vue'

export const progressState = reactive({ active: false, value: 0 })

let timer = null
let hideTimer = null

export function startProgress() {
  if (timer) clearInterval(timer)
  if (hideTimer) clearTimeout(hideTimer)
  progressState.active = true
  progressState.value = 8

  timer = setInterval(() => {
    if (progressState.value >= 88) return
    progressState.value += Math.max(0.8, (90 - progressState.value) * 0.12)
  }, 120)
}

export function finishProgress() {
  if (timer) clearInterval(timer)
  timer = null
  if (!progressState.active) return

  progressState.value = 100
  hideTimer = setTimeout(() => {
    progressState.active = false
    progressState.value = 0
  }, 260)
}
