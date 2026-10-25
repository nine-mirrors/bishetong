<template>
  <div ref="root" class="particle-field" aria-hidden="true">
    <canvas ref="canvas" />
  </div>
</template>

<script setup>
// ── 粒子光效背景：Canvas + 邻近连线 + 鼠标微交互 ──
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'light' },
  density: { type: Number, default: 0.00006 },
  linkDistance: { type: Number, default: 120 },
  interactive: { type: Boolean, default: true },
  speed: { type: Number, default: 0.34 },
})

const root = ref(null)
const canvas = ref(null)

let ctx = null
let raf = 0
let width = 0
let height = 0
let dpr = 1
let particles = []
let resizeObserver = null
let parent = null
let visible = true
const mouse = { x: -9999, y: -9999, active: false }

const palette = () =>
  props.variant === 'dark'
    ? { dot: '123, 211, 182', bright: '230, 255, 245', line: '123, 211, 182', glow: 0.55 }
    : { dot: '14, 122, 99', bright: '14, 122, 99', line: '14, 122, 99', glow: 0.18 }

function spawn() {
  const p = palette()
  const vx = (Math.random() - 0.5) * props.speed * 2
  const vy = (Math.random() - 0.5) * props.speed * 2
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx,
    vy,
    baseVx: vx,
    baseVy: vy,
    r: 0.8 + Math.random() * 1.6,
    alpha: 0.18 + Math.random() * 0.4 * (props.variant === 'dark' ? 1.6 : 1),
    color: Math.random() > 0.72 ? p.bright : p.dot,
    phase: Math.random() * Math.PI * 2,
  }
}

function seed() {
  const count = Math.max(10, Math.min(96, Math.round((width * height * props.density) / 1)))
  particles = Array.from({ length: count }, spawn)
}

function resize() {
  if (!root.value || !canvas.value) return
  const rect = root.value.getBoundingClientRect()
  width = rect.width
  height = rect.height
  if (width === 0 || height === 0) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.value.width = Math.round(width * dpr)
  canvas.value.height = Math.round(height * dpr)
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
  draw(true)
}

function step() {
  for (const item of particles) {
    if (props.interactive && mouse.active) {
      const dx = item.x - mouse.x
      const dy = item.y - mouse.y
      const dist = Math.hypot(dx, dy)
      if (dist < 160 && dist > 0.01) {
        const force = (1 - dist / 160) * 0.045
        item.vx += (dx / dist) * force
        item.vy += (dy / dist) * force
      }
    }

    // 回落到粒子自身的基准速度，保证长期运行也不会因阻尼而停住
    item.vx += (item.baseVx - item.vx) * 0.01
    item.vy += (item.baseVy - item.vy) * 0.01
    item.vx = Math.max(-0.9, Math.min(0.9, item.vx))
    item.vy = Math.max(-0.9, Math.min(0.9, item.vy))
    item.x += item.vx
    item.y += item.vy

    if (item.x < -20) item.x = width + 20
    if (item.x > width + 20) item.x = -20
    if (item.y < -20) item.y = height + 20
    if (item.y > height + 20) item.y = -20
  }
}

function draw(once = false) {
  if (!ctx || width === 0) return
  const p = palette()
  const time = performance.now() * 0.001
  ctx.clearRect(0, 0, width, height)

  ctx.lineWidth = 0.7
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i]
      const b = particles[j]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist > props.linkDistance) continue
      const alpha = (1 - dist / props.linkDistance) * (props.variant === 'dark' ? 0.28 : 0.1)
      ctx.strokeStyle = `rgba(${p.line}, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  // 鼠标与邻近粒子连线，形成“被牵引”的星座效果
  if (props.interactive && mouse.active) {
    const reach = props.linkDistance * 1.4
    for (const item of particles) {
      const dist = Math.hypot(item.x - mouse.x, item.y - mouse.y)
      if (dist > reach) continue
      const alpha = (1 - dist / reach) * (props.variant === 'dark' ? 0.62 : 0.26)
      ctx.strokeStyle = `rgba(${p.line}, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(mouse.x, mouse.y)
      ctx.lineTo(item.x, item.y)
      ctx.stroke()
    }

    const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 96)
    glow.addColorStop(0, props.variant === 'dark' ? 'rgba(123, 211, 182, 0.18)' : 'rgba(14, 122, 99, 0.09)')
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(mouse.x - 96, mouse.y - 96, 192, 192)
  }

  for (const item of particles) {
    const twinkle = 0.72 + 0.28 * Math.sin(time * 1.4 + item.phase)
    ctx.beginPath()
    ctx.fillStyle = `rgba(${item.color}, ${item.alpha * twinkle})`
    ctx.shadowBlur = props.variant === 'dark' ? 10 : 4
    ctx.shadowColor = `rgba(${p.line}, ${p.glow})`
    ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0

  if (!once) step()
  if (visible) raf = requestAnimationFrame(() => draw())
}

function onMouseMove(event) {
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  mouse.x = event.clientX - rect.left
  mouse.y = event.clientY - rect.top
  mouse.active = true
}

function onMouseLeave() {
  mouse.active = false
  mouse.x = -9999
  mouse.y = -9999
}

function onVisibility() {
  visible = !document.hidden
  if (visible) {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => draw())
  }
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  ctx = el.getContext('2d')
  parent = root.value?.parentElement || null

  resizeObserver = new ResizeObserver(resize)
  if (root.value) resizeObserver.observe(root.value)
  if (props.interactive && parent) {
    parent.addEventListener('mousemove', onMouseMove, { passive: true })
    parent.addEventListener('mouseleave', onMouseLeave, { passive: true })
  }
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  raf = requestAnimationFrame(() => draw())
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  if (parent) {
    parent.removeEventListener('mousemove', onMouseMove)
    parent.removeEventListener('mouseleave', onMouseLeave)
  }
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.particle-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

canvas {
  display: block;
}
</style>
