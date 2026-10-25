<script setup>
// ── 数据看板：教务 / 导师视角 ──
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.js'
import { fetchOverview } from '@/shared/api/stats.js'
import { downloadCsv } from '@/shared/api/export.js'
import { RISK_LEVEL } from '@/shared/types/dict.js'
import AnimatedNumber from '@/shared/components/AnimatedNumber.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const data = ref(null)

async function loadOverview() {
  loading.value = true
  try {
    data.value = await fetchOverview()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)

const stats = computed(() => {
  if (!data.value) return []
  return [
    { label: '项目总数', value: data.value.projectTotal, note: '进行中的毕业设计', index: '01' },
    {
      label: auth.isAdmin ? '学生总数' : '指导学生数',
      value: data.value.studentCount,
      note: auth.isAdmin ? '全平台在册学生' : '名下项目学生',
      index: '02',
    },
    { label: '待审核申请', value: data.value.pendingApplications, note: '需要处理的申请', index: '03' },
    { label: '逾期里程碑', value: data.value.overdueMilestones, note: '已过截止时间', index: '04' },
    { label: '待批阅里程碑', value: data.value.pendingReviewMilestones, note: '学生已提交', index: '05' },
  ]
})

const maxPhase = computed(() =>
  Math.max(1, ...(data.value?.phaseDistribution || []).map((item) => item.count)),
)

const riskTotal = computed(() =>
  (data.value?.riskDistribution || []).reduce((sum, item) => sum + item.count, 0),
)

const maxAdvisor = computed(() =>
  Math.max(1, ...(data.value?.advisorLoad || []).map((item) => item.count)),
)

const maxGrade = computed(() =>
  Math.max(1, ...(data.value?.gradeSummary?.distribution || []).map((item) => item.count)),
)

async function handleExportGrades() {
  try {
    const date = new Date().toISOString().slice(0, 10)
    await downloadCsv('/export/grades.csv', `grades-${date}.csv`)
    ElMessage.success('成绩导出已开始')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function riskPercent(count) {
  if (!riskTotal.value) return 0
  return (count / riskTotal.value) * 100
}

function riskColor(level) {
  return RISK_LEVEL[level].color
}

function openProject(id) {
  router.push({ name: 'ProjectDetail', params: { id } })
}
</script>

<template>
  <div v-loading="loading" class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">OPERATIONS OVERVIEW</p>
        <h1 class="page-title">数据看板</h1>
        <p class="page-sub">
          {{ auth.isAdmin ? '全局项目进度与风险分布，按阶段和风险等级聚合。' : '名下学生项目的进度、逾期与风险概况。' }}
        </p>
      </div>
      <div class="page-head-actions">
        <el-button v-if="auth.isAdmin" @click="handleExportGrades">导出成绩</el-button>
        <el-button @click="loadOverview">刷新数据</el-button>
      </div>
    </header>

    <template v-if="data">
      <div class="kpi-grid">
        <article v-for="item in stats" :key="item.label" class="kpi">
          <div class="kpi-top">
            <span class="kpi-label">{{ item.label }}</span>
            <span class="kpi-index num">{{ item.index }}</span>
          </div>
          <strong class="kpi-value num"><AnimatedNumber :value="item.value" /></strong>
          <span class="kpi-note">{{ item.note }}</span>
        </article>
      </div>

      <div class="chart-grid">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">
              <h2 class="section-title">阶段分布</h2>
              <span class="panel-count num">{{ data.projectTotal }} PROJECTS</span>
            </div>
            <span class="panel-note">TOPIC → ARCHIVED</span>
          </div>
          <div class="panel-body bars">
            <div v-for="(item, index) in data.phaseDistribution" :key="item.key" class="bar-row">
              <span class="bar-index num">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <span class="bar-fill" :style="{ width: `${(item.count / maxPhase) * 100}%` }" />
              </div>
              <span class="bar-value num">{{ item.count }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">
              <h2 class="section-title">风险分布</h2>
              <span class="panel-count num">{{ riskTotal }} PROJECTS</span>
            </div>
            <span class="panel-note">四因子加权</span>
          </div>
          <div class="panel-body">
            <div class="stack">
              <span
                v-for="item in data.riskDistribution"
                :key="item.key"
                class="stack-seg"
                :style="{ width: `${riskPercent(item.count)}%`, background: riskColor(item.key) }"
              />
              <span v-if="riskTotal === 0" class="stack-empty" />
            </div>

            <ul class="legend">
              <li v-for="item in data.riskDistribution" :key="item.key">
                <span class="legend-dot" :style="{ background: riskColor(item.key) }" />
                <span class="legend-label">{{ item.label }}</span>
                <span class="legend-value num">{{ item.count }}</span>
              </li>
            </ul>

            <p class="panel-tip">高风险 = 逾期、完成度偏低、临近截止、批阅等待叠加。</p>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2 class="section-title">成绩概览</h2>
            <span class="panel-count num">{{ data.gradeSummary.published }} PUBLISHED</span>
          </div>
          <span class="panel-note">导师 30% · 评阅 30% · 答辩 40%</span>
        </div>
        <div class="panel-body grade-body">
          <div class="grade-kpi">
            <span class="grade-value num">
              <AnimatedNumber
                v-if="data.gradeSummary.average !== null"
                :value="data.gradeSummary.average"
                :decimals="1"
              />
              <template v-else>—</template>
            </span>
            <span class="grade-label">平均分 · 已录入 {{ data.gradeSummary.graded }} 项</span>
          </div>

          <div class="bars">
            <div v-for="item in data.gradeSummary.distribution" :key="item.level" class="bar-row">
              <span class="bar-index num">—</span>
              <span class="bar-label">{{ item.level }}</span>
              <div class="bar-track">
                <span class="bar-fill" :style="{ width: `${(item.count / maxGrade) * 100}%` }" />
              </div>
              <span class="bar-value num">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="data.quality" class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2 class="section-title">质量抽检</h2>
            <span class="panel-count num">BLIND REVIEW & AWARD</span>
          </div>
          <span class="panel-note">匿名评阅 · 优秀论文</span>
        </div>
        <div class="panel-body quality-body">
          <div class="quality-grid">
            <div class="quality-item">
              <span>盲审任务</span>
              <strong class="num">{{ data.quality.blindTotal }}</strong>
            </div>
            <div class="quality-item">
              <span>已提交</span>
              <strong class="num">{{ data.quality.blindSubmitted }}</strong>
            </div>
            <div class="quality-item">
              <span>待评阅</span>
              <strong class="num">{{ data.quality.blindPending }}</strong>
            </div>
            <div class="quality-item award">
              <span>优秀论文</span>
              <strong class="num">{{ data.quality.excellentCount }}</strong>
            </div>
          </div>
          <div class="quality-actions">
            <el-button size="small" @click="router.push({ name: 'AdminBlindReviews' })">
              进入盲审抽检
            </el-button>
            <el-button size="small" type="primary" plain @click="router.push({ name: 'AdminExcellent' })">
              论文评选
            </el-button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2 class="section-title">高风险项目</h2>
            <span class="panel-count num">TOP 5</span>
          </div>
          <span class="panel-note">按风险分倒序</span>
        </div>
        <div class="table-wrap">
          <el-table :data="data.topRiskProjects" empty-text="暂无项目">
            <el-table-column label="项目" min-width="300">
              <template #default="{ row }">
                <button type="button" class="project-link" @click="openProject(row.projectId)">
                  {{ row.title }}
                </button>
              </template>
            </el-table-column>
            <el-table-column prop="student" label="学生" width="130" />
            <el-table-column label="风险分" width="120">
              <template #default="{ row }">
                <span class="risk-score num" :style="{ color: riskColor(row.level) }">{{ row.score }}</span>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="110">
              <template #default="{ row }">
                <el-tag :type="RISK_LEVEL[row.level].elType" effect="light">{{ row.levelLabel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="" width="90" align="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openProject(row.projectId)">查看 →</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section v-if="auth.isAdmin && data.advisorLoad.length" class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <h2 class="section-title">导师负载</h2>
            <span class="panel-count num">{{ data.advisorLoad.length }} ADVISORS</span>
          </div>
          <span class="panel-note">按指导学生数</span>
        </div>
        <div class="panel-body bars">
          <div v-for="item in data.advisorLoad" :key="item.advisorId" class="bar-row">
            <span class="bar-index num">—</span>
            <span class="bar-label">{{ item.name }}</span>
            <div class="bar-track">
              <span class="bar-fill load" :style="{ width: `${(item.count / maxAdvisor) * 100}%` }" />
            </div>
            <span class="bar-value num">{{ item.count }}</span>
          </div>
        </div>
      </section>
    </template>

    <div v-else-if="!loading" class="panel">
      <EmptyState title="暂无统计数据" description="有项目立项后，这里会显示阶段与风险概览。" />
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 18px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--border-radius-base);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-base);
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.kpi-index {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.kpi-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
}

.kpi-note {
  font-size: 10.5px;
  color: var(--text-faint);
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-count {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.panel-note {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-row {
  display: grid;
  grid-template-columns: 22px 60px 1fr 30px;
  align-items: center;
  gap: 10px;
}

.bar-index {
  font-size: 9px;
  color: var(--text-faint);
}

.bar-label {
  font-size: 12px;
  color: var(--text-regular);
}

.bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--line-soft);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--jade-600);
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.bar-fill.load {
  background: var(--ink-600);
}

.bar-value {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.stack {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--line-soft);
}

.stack-seg {
  display: block;
  height: 100%;
}

.stack-empty {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--line-soft);
}

.legend {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: flex;
  gap: 24px;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 7px;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.legend-label {
  font-size: 11.5px;
  color: var(--text-regular);
}

.legend-value {
  font-size: 12px;
  font-weight: 600;
}

.panel-tip {
  margin: 18px 0 0;
  font-size: 10.5px;
  color: var(--text-faint);
}

.table-wrap {
  padding: 0 20px 8px;
}

.grade-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  align-items: center;
}

.grade-kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 24px;
  border-right: 1px solid var(--line-soft);
}

.grade-value {
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--jade-700);
}

.grade-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.quality-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.quality-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(88px, 1fr));
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.quality-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--surface);
}

.quality-item span {
  font-size: 10.5px;
  color: var(--text-secondary);
}

.quality-item strong {
  font-size: 24px;
  line-height: 1;
}

.quality-item.award strong {
  color: var(--amber-600);
}

.quality-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.project-link {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.project-link:hover {
  color: var(--jade-600);
}

.risk-score {
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }

  .grade-body {
    grid-template-columns: 1fr;
  }

  .grade-kpi {
    padding-right: 0;
    padding-bottom: 14px;
    border-right: none;
    border-bottom: 1px solid var(--line-soft);
  }

  .quality-body {
    flex-direction: column;
    align-items: stretch;
  }

  .quality-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quality-actions {
    flex-direction: row;
  }
}
</style>
