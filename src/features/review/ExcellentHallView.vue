<script setup>
// ── 优秀论文展示 ──
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchAwards } from '@/shared/api/excellent.js'
import { formatDate } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const loading = ref(false)
const awards = ref([])

async function loadData() {
  loading.value = true
  try {
    awards.value = await fetchAwards()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">EXCELLENT THESIS</p>
        <h1 class="page-title">优秀论文</h1>
        <p class="page-sub">记录本年度获评校级 / 院级的毕业设计作品。</p>
      </div>
      <div class="page-head-actions">
        <span class="head-meta num">{{ awards.length }} WORKS</span>
      </div>
    </header>

    <div v-loading="loading" class="award-grid">
      <article v-for="award in awards" :key="award.id" class="award-card">
        <div class="award-top">
          <span class="award-level" :class="award.level.toLowerCase()">
            {{ award.level === 'SCHOOL' ? '校级优秀论文' : '院级优秀论文' }}
          </span>
          <span class="award-year num">{{ new Date(award.awardedAt).getFullYear() }}</span>
        </div>
        <h3 class="award-title">{{ award.project.title }}</h3>
        <p class="award-meta">
          学生 {{ award.project.student.name }} · 导师 {{ award.project.advisor.name }}
        </p>
        <p v-if="award.remark" class="award-remark">{{ award.remark }}</p>
        <p class="award-date num">{{ formatDate(award.awardedAt) }}</p>
      </article>

      <EmptyState
        v-if="!loading && awards.length === 0"
        title="暂无优秀论文"
        description="教务完成评选后，获奖作品会展示在这里。"
      />
    </div>
  </div>
</template>

<style scoped>
.head-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.award-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  min-height: 200px;
}

.award-card {
  position: relative;
  padding: 22px 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.award-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-base);
}

.award-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--jade-500), var(--amber-600));
}

.award-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.award-level {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  padding: 4px 9px;
  border-radius: 999px;
}

.award-level.school {
  color: #8a5a00;
  background: var(--amber-100);
}

.award-level.college {
  color: var(--jade-700);
  background: var(--jade-100);
}

.award-year {
  font-size: 10px;
  color: var(--text-faint);
}

.award-title {
  margin: 16px 0 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.award-meta {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.award-remark {
  margin: 12px 0 0;
  padding: 10px 12px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-regular);
  background: var(--surface-soft);
}

.award-date {
  margin: 14px 0 0;
  font-size: 9.5px;
  color: var(--text-faint);
}

@media (max-width: 900px) {
  .award-grid {
    grid-template-columns: 1fr;
  }
}
</style>
