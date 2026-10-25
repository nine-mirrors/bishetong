<script setup>
// ── 手写签名板 ──
import { onMounted, ref } from 'vue'

const emit = defineEmits(['change'])

const canvasRef = ref(null)
const hasInk = ref(false)
let context = null
let drawing = false
let lastPoint = null

onMounted(() => {
  requestAnimationFrame(setupCanvas)
})

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const width = canvas.clientWidth
  if (!width) {
    // 弹窗入场动画期间宽度可能为 0，下一帧重试
    requestAnimationFrame(setupCanvas)
    return
  }

  const ratio = window.devicePixelRatio || 1
  const height = canvas.clientHeight || 200
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  context = canvas.getContext('2d')
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.lineWidth = 2.2
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#14211d'
}

function position(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function start(event) {
  if (!context) return
  drawing = true
  lastPoint = position(event)
  context.beginPath()
  context.moveTo(lastPoint.x, lastPoint.y)
  try {
    canvasRef.value.setPointerCapture?.(event.pointerId)
  } catch {
    // 某些环境不支持 pointer capture，忽略即可
  }
}

function move(event) {
  if (!drawing || !context) return
  const point = position(event)
  context.lineTo(point.x, point.y)
  context.stroke()
  lastPoint = point
  hasInk.value = true
}

function end() {
  if (!drawing) return
  drawing = false
  lastPoint = null
  emit('change', hasInk.value ? canvasRef.value.toDataURL('image/png') : '')
}

function clear() {
  const canvas = canvasRef.value
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  hasInk.value = false
  emit('change', '')
}

function reset() {
  clear()
  requestAnimationFrame(setupCanvas)
}

function toDataURL() {
  return hasInk.value ? canvasRef.value.toDataURL('image/png') : ''
}

defineExpose({ clear, reset, toDataURL, hasInk })
</script>

<template>
  <div class="pad">
    <canvas
      ref="canvasRef"
      class="canvas"
      @pointerdown.prevent="start"
      @pointermove.prevent="move"
      @pointerup="end"
      @pointerleave="end"
    />
    <div class="pad-foot">
      <span class="hint">使用鼠标或触控笔在区域内签名</span>
      <el-button size="small" text @click="clear">清除重写</el-button>
    </div>
  </div>
</template>

<style scoped>
.pad {
  border: 1px dashed var(--line);
  border-radius: 6px;
  background:
    linear-gradient(rgba(11, 21, 18, 0.035) 1px, transparent 1px),
    var(--surface-soft);
  background-size: 100% 40px;
}

.canvas {
  display: block;
  width: 100%;
  height: 200px;
  cursor: crosshair;
  touch-action: none;
}

.pad-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px dashed var(--line);
}

.hint {
  font-size: 10.5px;
  color: var(--text-faint);
}
</style>
