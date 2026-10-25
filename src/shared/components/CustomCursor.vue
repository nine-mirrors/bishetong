<template>
  <Teleport to="body">
    <div v-if="enabled" ref="layer" class="cursor-layer" aria-hidden="true">
      <span ref="aura" class="cursor-aura" />
      <span ref="ring" class="cursor-ring">
        <span class="cursor-arrow">
          <svg viewBox="0 0 20 26">
            <defs>
              <linearGradient
                id="cursor-arrow-gradient"
                x1="3"
                y1="2"
                x2="15"
                y2="20"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stop-color="#f4faf7" />
                <stop offset="0.55" stop-color="#c8ecdf" />
                <stop offset="1" stop-color="#7bd3b6" />
              </linearGradient>
            </defs>
            <path
              class="arrow-shape"
              d="M2 1 L2 21.2 L7.1 16.3 L10.4 23.9 L14.1 22.3 L10.8 14.9 L18.4 14.3 Z"
            />
            <path class="arrow-edge" d="M2 1 L2 21.2 L7.1 16.3" />
            <circle class="arrow-accent" cx="12.8" cy="20.4" r="1.25" />
          </svg>
        </span>
        <span class="cursor-orbit" />
        <span class="cursor-ibeam" />
      </span>
      <span ref="labelEl" class="cursor-label">{{ label }}</span>
    </div>
  </Teleport>
</template>

<script setup>
// ── 项目专属鼠标指针：原生箭头造型 + 玉石配色 + 状态反馈 + 跟随柔光 ──
import { onBeforeUnmount, onMounted, ref } from 'vue'

const enabled = ref(false)
const layer = ref(null)
const aura = ref(null)
const ring = ref(null)
const labelEl = ref(null)
const label = ref('')

let raf = 0
let busyTimer = 0
let leftTimer = 0
let started = false
let visible = false

const target = { x: 0, y: 0 }
const ringPos = { x: 0, y: 0 }
const dotPos = { x: 0, y: 0 }
const auraPos = { x: 0, y: 0 }

const flags = {
  pointer: false,
  text: false,
  disabled: false,
  drag: false,
  loading: false,
  left: false,
  right: false,
  middle: false,
}

function applyPosition(element, x, y) {
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

function render() {
  ringPos.x += (target.x - ringPos.x) * 0.28
  ringPos.y += (target.y - ringPos.y) * 0.28
  dotPos.x += (target.x - dotPos.x) * 0.62
  dotPos.y += (target.y - dotPos.y) * 0.62
  auraPos.x += (target.x - auraPos.x) * 0.1
  auraPos.y += (target.y - auraPos.y) * 0.1

  if (ring.value) applyPosition(ring.value, ringPos.x, ringPos.y)
  if (aura.value) applyPosition(aura.value, auraPos.x, auraPos.y)

  if (labelEl.value) {
    const lx = Math.min(window.innerWidth - 96, dotPos.x + 18)
    const ly = Math.min(window.innerHeight - 30, dotPos.y + 18)
    applyPosition(labelEl.value, lx, ly)
  }

  raf = requestAnimationFrame(render)
}

function syncPositions() {
  ringPos.x = dotPos.x = auraPos.x = target.x
  ringPos.y = dotPos.y = auraPos.y = target.y
}

function paintInstant() {
  if (ring.value) applyPosition(ring.value, ringPos.x, ringPos.y)
  if (aura.value) applyPosition(aura.value, auraPos.x, auraPos.y)
  if (labelEl.value) {
    applyPosition(
      labelEl.value,
      Math.min(window.innerWidth - 96, target.x + 18),
      Math.min(window.innerHeight - 30, target.y + 18),
    )
  }
}

function show() {
  if (!layer.value || visible) return
  visible = true
  layer.value.style.opacity = '1'
}

function hide() {
  if (!layer.value) return
  visible = false
  layer.value.style.opacity = '0'
}

function resolveLabel() {
  if (flags.right) return 'R-CLICK'
  if (flags.middle) return 'M-CLICK'
  if (flags.left) return 'CLICK'
  if (flags.loading) return 'LOADING'
  if (flags.disabled && !flags.text) return 'LOCKED'
  if (flags.drag) return 'DRAG'
  if (flags.pointer && !flags.text) return 'OPEN'
  return ''
}

function applyState() {
  const element = layer.value
  if (!element) return
  const isText = flags.text
  const isDisabled = flags.disabled && !isText
  const isPointer = flags.pointer && !isText && !isDisabled

  element.classList.toggle('is-pointer', isPointer && !flags.loading && !flags.right && !flags.middle)
  element.classList.toggle('is-text', isText)
  element.classList.toggle('is-loading', flags.loading)
  element.classList.toggle('is-right', flags.right)
  element.classList.toggle('is-middle', flags.middle)
  element.classList.toggle('is-disabled', isDisabled)
  element.classList.toggle('is-drag', flags.drag && !isText)

  const next = resolveLabel()
  label.value = next
  element.classList.toggle('has-label', Boolean(next))
}

function updateHover(element) {
  if (!(element instanceof Element)) return
  flags.text = Boolean(
    element.closest(
      'textarea, [contenteditable="true"], input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="number"], input[type="url"], input[type="tel"]',
    ),
  )
  flags.disabled = Boolean(
    element.closest('button:disabled, [aria-disabled="true"], .is-disabled'),
  )
  flags.drag = Boolean(
    element.closest('[draggable="true"], .el-slider__button, .el-slider__runway'),
  )
  flags.pointer = Boolean(
    element.closest(
      'a, button, label, select, [role="button"], [role="tab"], .nav-item, .quick-chip, .result-row, .search-trigger, .icon-btn, .el-select__wrapper, .el-switch, .el-tabs__item',
    ),
  )
  applyState()
}

function detectBusy() {
  if (!layer.value) return
  const maskBusy = [...document.querySelectorAll('.el-loading-mask')].some(
    (item) => item.offsetParent !== null && getComputedStyle(item).display !== 'none',
  )
  flags.loading = Boolean(
    maskBusy ||
      document.querySelector('.route-progress.active, .el-button.is-loading, [aria-busy="true"]'),
  )
  applyState()
}

function onMouseMove(event) {
  if (!enabled.value) return
  document.documentElement.classList.add('has-custom-cursor')
  target.x = event.clientX
  target.y = event.clientY
  updateHover(event.target)

  if (!started) {
    started = true
    syncPositions()
  }

  if (!visible) {
    syncPositions()
    paintInstant()
  }

  show()
}

function spawnRipple(event, button) {
  if (!layer.value) return
  const ripple = document.createElement('span')
  ripple.className = 'cursor-ripple'
  if (button === 2) ripple.classList.add('ripple-right')
  if (button === 1) ripple.classList.add('ripple-middle')
  ripple.style.left = `${event.clientX}px`
  ripple.style.top = `${event.clientY}px`
  layer.value.appendChild(ripple)
  setTimeout(() => ripple.remove(), 620)
}

function onMouseDown(event) {
  if (!enabled.value) return
  if (event.button === 0) {
    flags.left = true
    clearTimeout(leftTimer)
    leftTimer = window.setTimeout(() => {
      flags.left = false
      applyState()
    }, 420)
  }
  if (event.button === 2) flags.right = true
  if (event.button === 1) flags.middle = true
  layer.value?.classList.add('is-pressed')
  applyState()
  spawnRipple(event, event.button)
}

function onMouseUp() {
  clearTimeout(leftTimer)
  flags.left = false
  flags.right = false
  flags.middle = false
  layer.value?.classList.remove('is-pressed')
  applyState()
}

function onContextMenu() {
  // 右键菜单打开后收起右键状态，避免指针标签长时间停留
  setTimeout(() => {
    flags.right = false
    applyState()
  }, 260)
}

function onMouseOut(event) {
  if (!event.relatedTarget) hide()
}

function onWindowBlur() {
  flags.left = false
  flags.right = false
  flags.middle = false
  layer.value?.classList.remove('is-pressed')
  applyState()
  hide()
  document.documentElement.classList.remove('has-custom-cursor')
}

onMounted(() => {
  if (!window.matchMedia('(pointer: fine)').matches) return

  enabled.value = true

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mousedown', onMouseDown, { passive: true })
  window.addEventListener('mouseup', onMouseUp, { passive: true })
  window.addEventListener('contextmenu', onContextMenu, { passive: true })
  window.addEventListener('mouseout', onMouseOut, { passive: true })
  window.addEventListener('blur', onWindowBlur)

  busyTimer = window.setInterval(detectBusy, 350)
  raf = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(busyTimer)
  clearTimeout(leftTimer)
  document.documentElement.classList.remove('has-custom-cursor')
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('mouseout', onMouseOut)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<style scoped>
.cursor-layer {
  --cursor-stroke: #0b1512;
  --cursor-line: #7bd3b6;
  --cursor-glow: rgba(123, 211, 182, 0.45);
  position: fixed;
  inset: 0;
  /* 传送到 body 并压过 Element Plus 弹层（2000+），避免指针被对话框/遮罩盖住 */
  z-index: 2147483000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cursor-aura {
  position: absolute;
  left: 0;
  top: 0;
  width: 340px;
  height: 340px;
  margin: -170px 0 0 -170px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(123, 211, 182, 0.13),
    rgba(14, 122, 99, 0.045) 46%,
    transparent 70%
  );
  filter: blur(14px);
  opacity: 0.7;
  transition: opacity 0.25s ease;
}

.cursor-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
}

/* 原生箭头造型，路径尖端与鼠标热点对齐，保留项目配色 */
.cursor-arrow {
  position: absolute;
  left: -2px;
  top: -1px;
  width: 20px;
  height: 26px;
  transform-origin: 2px 1px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35)) drop-shadow(0 0 5px rgba(123, 211, 182, 0.22));
  transition:
    transform 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.16s ease,
    opacity 0.16s ease;
}

.cursor-arrow svg {
  display: block;
  width: 20px;
  height: 26px;
  overflow: visible;
}

.arrow-shape {
  fill: url(#cursor-arrow-gradient);
  stroke: var(--cursor-stroke);
  stroke-width: 1.2;
  stroke-linejoin: round;
  transition: stroke 0.15s ease;
}

.arrow-edge {
  fill: none;
  stroke: rgba(11, 21, 18, 0.32);
  stroke-width: 1;
  stroke-linecap: round;
  transition: stroke 0.15s ease;
}

.arrow-accent {
  fill: #d99a2b;
  opacity: 0.9;
  transition: fill 0.15s ease;
}

.cursor-ibeam {
  position: absolute;
  left: -1px;
  top: -9px;
  width: 2px;
  height: 18px;
  background: var(--jade-600);
  box-shadow: 0 0 6px var(--cursor-glow);
  opacity: 0;
  transition: opacity 0.12s ease;
}

.cursor-ibeam::before,
.cursor-ibeam::after {
  content: '';
  position: absolute;
  left: -2px;
  width: 6px;
  height: 1px;
  background: var(--jade-600);
}

.cursor-ibeam::before {
  top: 0;
}

.cursor-ibeam::after {
  bottom: 0;
}

.cursor-orbit {
  position: absolute;
  left: -17px;
  top: -17px;
  width: 34px;
  height: 34px;
  border: 1px dashed var(--cursor-line);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.cursor-label {
  position: absolute;
  left: 0;
  top: 0;
  padding: 3px 6px;
  border: 1px solid rgba(123, 211, 182, 0.24);
  border-radius: 2px;
  background: rgba(11, 21, 18, 0.86);
  color: var(--jade-200);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.cursor-layer.has-label .cursor-label {
  opacity: 1;
}

/* 可交互元素：箭头轻微放大，描边转为玉青亮色 */
.cursor-layer.is-pointer {
  --cursor-line: var(--jade-300);
  --cursor-stroke: var(--jade-700);
}

.cursor-layer.is-pointer .cursor-arrow {
  transform: scale(1.08);
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35)) drop-shadow(0 0 9px rgba(123, 211, 182, 0.42));
}

.cursor-layer.is-pointer .arrow-accent {
  fill: var(--jade-200);
}

/* 文本输入：切换为标准 I 型光标 */
.cursor-layer.is-text .cursor-arrow,
.cursor-layer.is-text .cursor-orbit {
  opacity: 0;
}

.cursor-layer.is-text .cursor-ibeam {
  opacity: 1;
}

/* 加载中：箭头保留，外圈显示旋转轨道 */
.cursor-layer.is-loading {
  --cursor-line: var(--jade-300);
}

.cursor-layer.is-loading .cursor-orbit {
  opacity: 1;
  animation: cursor-spin 1.6s linear infinite;
}

.cursor-layer.is-loading .cursor-arrow {
  opacity: 0.45;
}

.cursor-layer.is-loading .cursor-label {
  color: var(--jade-200);
  border-color: rgba(123, 211, 182, 0.4);
}

/* 右键：琥珀色 */
.cursor-layer.is-right {
  --cursor-line: #d99a2b;
  --cursor-stroke: #a86f0e;
  --cursor-glow: rgba(217, 154, 43, 0.45);
}

.cursor-layer.is-right .cursor-orbit {
  opacity: 1;
  border-style: solid;
  border-color: rgba(217, 154, 43, 0.35);
}

.cursor-layer.is-right .arrow-accent {
  fill: #f0c069;
}

.cursor-layer.is-right .cursor-label {
  color: #f0c069;
  border-color: rgba(217, 154, 43, 0.38);
}

/* 中键：苔绿色 */
.cursor-layer.is-middle {
  --cursor-line: #5fbf8f;
  --cursor-stroke: #2f8a63;
  --cursor-glow: rgba(95, 191, 143, 0.45);
}

.cursor-layer.is-middle .cursor-orbit {
  opacity: 1;
  border-color: rgba(95, 191, 143, 0.4);
}

.cursor-layer.is-middle .arrow-accent {
  fill: #9fe3c0;
}

.cursor-layer.is-middle .cursor-label {
  color: #9fe3c0;
  border-color: rgba(95, 191, 143, 0.38);
}

/* 拖拽 */
.cursor-layer.is-drag .cursor-arrow {
  transform: rotate(-4deg) scale(0.98);
}

/* 禁用 */
.cursor-layer.is-disabled {
  --cursor-line: var(--text-faint);
  --cursor-glow: transparent;
}

.cursor-layer.is-disabled .cursor-arrow {
  opacity: 0.55;
  filter: grayscale(1);
}

.cursor-layer.is-disabled .cursor-label {
  color: rgba(255, 255, 255, 0.55);
  border-color: rgba(255, 255, 255, 0.18);
}

.cursor-layer.is-pressed .cursor-arrow {
  transform: scale(0.86);
}

.cursor-ripple {
  position: absolute;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border: 1px solid rgba(123, 211, 182, 0.75);
  border-radius: 50%;
  animation: cursor-ripple 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.cursor-ripple.ripple-right {
  border-color: rgba(217, 154, 43, 0.8);
}

.cursor-ripple.ripple-middle {
  border-color: rgba(95, 191, 143, 0.8);
}

@keyframes cursor-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes cursor-ripple {
  from {
    transform: scale(0.5);
    opacity: 0.85;
  }

  to {
    transform: scale(2.8);
    opacity: 0;
  }
}
</style>

<style>
@media (pointer: fine) {
  html.has-custom-cursor,
  html.has-custom-cursor body,
  html.has-custom-cursor body * {
    cursor: none !important;
  }
}
</style>
