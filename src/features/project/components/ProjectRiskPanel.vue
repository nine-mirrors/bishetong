<script setup>
// ── 项目详情 · 风险面板 ──
import { computed } from 'vue'
import { RISK_LEVEL } from '@/shared/types/dict.js'
import AnimatedNumber from '@/shared/components/AnimatedNumber.vue'

const props = defineProps({
  risk: { type: Object, required: true },
})

const riskStyle = computed(() => {
  const score = props.risk?.score || 0
  const color = RISK_LEVEL[props.risk?.level || 'LOW'].color
  return {
    // 动态进度环，唯一允许的内联样式场景（CLAUDE.md §1.3）
    background: `conic-gradient(${color} 0% ${score}%, #f0eee6 ${score}% 100%)`,
  }
})

const topFactors = computed(() =>
  (props.risk?.factors || []).filter((item) => item.contribution > 0).slice(0, 3),
)
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2 class="section-title">进度风险</h2>
      <span class="panel-note">四因子加权</span>
    </div>

    <div class="risk-body">
      <div class="risk-score">
        <div class="ring" :style="riskStyle">
          <div class="ring-inner">
            <span class="score num"><AnimatedNumber :value="risk.score" /></span>
            <span class="score-unit">/100</span>
          </div>
        </div>
        <el-tag :type="RISK_LEVEL[risk.level].elType" effect="light">{{ risk.levelLabel }}</el-tag>
      </div>

      <div class="risk-stats">
        <div class="stat">
          <span class="stat-value num">{{ risk.summary.approved }}/{{ risk.summary.total }}</span>
          <span class="stat-label">里程碑通过</span>
        </div>
        <div class="stat">
          <span class="stat-value num">{{ risk.summary.overdue }}</span>
          <span class="stat-label">逾期</span>
        </div>
        <div class="stat">
          <span class="stat-value num">{{ risk.summary.pendingReview }}</span>
          <span class="stat-label">待批阅</span>
        </div>
        <div class="stat">
          <span class="stat-value num">
            {{ risk.summary.nearestDueDays === null ? '—' : risk.summary.nearestDueDays }}
          </span>
          <span class="stat-label">最近截止/天</span>
        </div>
      </div>

      <div v-if="topFactors.length" class="factors">
        <div v-for="factor in topFactors" :key="factor.key" class="factor">
          <div class="factor-head">
            <span class="factor-label">{{ factor.label }}</span>
            <span class="factor-value num">+{{ factor.contribution }}</span>
          </div>
          <div class="factor-bar">
            <span class="factor-fill" :style="{ width: `${factor.contribution}%` }" />
          </div>
          <p class="factor-advice">{{ factor.advice }}</p>
        </div>
      </div>
      <p v-else class="all-good">暂无风险因子，保持当前节奏。</p>
    </div>
  </section>
</template>

<style scoped>
.panel-note {
  font-size: 10.5px;
  color: var(--text-faint);
}

.risk-body {
  padding: 18px 20px 20px;
}

.risk-score {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ring {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.ring-inner {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.score-unit {
  margin-top: 2px;
  font-size: 9px;
  color: var(--text-faint);
}

.risk-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 18px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  background: var(--surface);
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.factors {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.factor-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
}

.factor-label {
  font-weight: 600;
  color: var(--text-primary);
}

.factor-value {
  color: var(--clay-600);
}

.factor-bar {
  height: 4px;
  background: var(--line-soft);
  border-radius: 2px;
  overflow: hidden;
}

.factor-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--jade-500), var(--clay-600));
}

.factor-advice {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.all-good {
  margin: 18px 0 0;
  font-size: 12px;
  color: var(--moss-600);
}
</style>
