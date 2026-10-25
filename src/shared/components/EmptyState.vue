<script setup>
// ── 空状态 ──
defineProps({
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '' },
  actionText: { type: String, default: '' },
})

const emit = defineEmits(['action'])
</script>

<template>
  <div class="empty-state">
    <div class="art" aria-hidden="true">
      <span class="art-square art-square-1" />
      <span class="art-square art-square-2" />
      <span class="art-dot" />
    </div>
    <p class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <el-button v-if="actionText" size="small" @click="emit('action')">{{ actionText }}</el-button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 44px 20px;
  text-align: center;
}

.art {
  position: relative;
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
}

.art-square {
  position: absolute;
  border: 1px solid var(--line);
  border-radius: 3px;
}

.art-square-1 {
  inset: 0;
  transform: rotate(0deg);
}

.art-square-2 {
  inset: 9px;
  border-color: var(--jade-300);
  transform: rotate(12deg);
}

.art-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jade-600);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4px rgba(14, 122, 99, 0.1);
}

.empty-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-desc {
  max-width: 320px;
  margin: 6px 0 14px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-secondary);
}
</style>
