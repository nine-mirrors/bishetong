<script setup>
// ── 数字滚动 ──
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 720 },
  decimals: { type: Number, default: 0 },
})

const display = ref(0)
let frame = null

function animate(target) {
  if (frame) cancelAnimationFrame(frame)
  const from = display.value
  const start = performance.now()
  const duration = Math.max(1, props.duration)

  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - (1 - progress) ** 3
    display.value = from + (target - from) * eased
    if (progress < 1) {
      frame = requestAnimationFrame(step)
    }
  }
  frame = requestAnimationFrame(step)
}

watch(
  () => props.value,
  (value) => animate(Number(value) || 0),
  { immediate: true },
)

onUnmounted(() => {
  if (frame) cancelAnimationFrame(frame)
})

const text = computed(() => display.value.toFixed(props.decimals))
</script>

<template>
  <span class="animated-number">{{ text }}</span>
</template>

<style scoped>
.animated-number {
  font-variant-numeric: tabular-nums;
}
</style>
