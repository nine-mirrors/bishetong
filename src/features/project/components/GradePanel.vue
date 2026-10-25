<script setup>
// ── 项目详情 · 合规检查与评阅成绩 ──
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchCompliance,
  fetchGrade,
  publishGrade,
  saveGrade,
} from '@/shared/api/project.js'
import { aiAssist } from '@/shared/api/ai.js'
import { formatDateTime } from '@/shared/utils/format.js'
import AnimatedNumber from '@/shared/components/AnimatedNumber.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  isStudent: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
})

const loading = ref(false)
const grade = ref(null)
const compliance = ref(null)

async function loadData() {
  loading.value = true
  try {
    const [gradeData, complianceData] = await Promise.all([
      fetchGrade(props.projectId),
      fetchCompliance(props.projectId),
    ])
    grade.value = gradeData
    compliance.value = complianceData
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => props.projectId, loadData)

const complianceTagType = computed(() => {
  if (!compliance.value) return 'info'
  return compliance.value.level === 'READY'
    ? 'success'
    : compliance.value.level === 'RISK'
      ? 'warning'
      : 'danger'
})

// ── 成绩编辑 ──
const editVisible = ref(false)
const saving = ref(false)
const publishing = ref(false)
const form = reactive({
  advisorScore: null,
  reviewerScore: null,
  defenseScore: null,
  plagiarismRate: null,
  defenseGroup: '',
  defenseLocation: '',
  defenseAt: '',
})

function openEdit() {
  form.advisorScore = grade.value?.advisorScore ?? null
  form.reviewerScore = grade.value?.reviewerScore ?? null
  form.defenseScore = grade.value?.defenseScore ?? null
  form.plagiarismRate = grade.value?.plagiarismRate ?? null
  form.defenseGroup = grade.value?.defenseGroup || ''
  form.defenseLocation = grade.value?.defenseLocation || ''
  form.defenseAt = grade.value?.defenseAt
    ? new Date(grade.value.defenseAt).toISOString().slice(0, 19)
    : ''
  editVisible.value = true
}

const previewFinal = computed(() => {
  const { advisorScore, reviewerScore, defenseScore } = form
  if (advisorScore === null || reviewerScore === null || defenseScore === null) return null
  return Number(
    (advisorScore * 0.3 + reviewerScore * 0.3 + defenseScore * 0.4).toFixed(1),
  )
})

const previewLevel = computed(() => {
  const score = previewFinal.value
  if (score === null) return ''
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '中等'
  if (score >= 60) return '及格'
  return '不及格'
})

async function submitGrade() {
  saving.value = true
  try {
    grade.value = await saveGrade(props.projectId, {
      advisorScore: form.advisorScore,
      reviewerScore: form.reviewerScore,
      defenseScore: form.defenseScore,
      plagiarismRate: form.plagiarismRate,
      defenseGroup: form.defenseGroup,
      defenseLocation: form.defenseLocation,
      defenseAt: form.defenseAt || null,
    })
    ElMessage.success('成绩已保存')
    editVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

async function handlePublish() {
  try {
    await ElMessageBox.confirm('发布后学生可见成绩，且不能再修改，确认发布？', '发布成绩', {
      type: 'warning',
    })
  } catch {
    return
  }
  publishing.value = true
  try {
    grade.value = await publishGrade(props.projectId)
    ElMessage.success('成绩已发布')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    publishing.value = false
  }
}

const published = computed(() => grade.value?.status === 'PUBLISHED')

// ── AI 合规建议 ──
const aiVisible = ref(false)
const aiLoading = ref(false)
const aiAdvice = ref('')

async function generateAdvice() {
  aiLoading.value = true
  aiVisible.value = true
  aiAdvice.value = ''
  try {
    const result = await aiAssist({ type: 'compliance_advice', projectId: props.projectId })
    aiAdvice.value = result.content
  } catch (error) {
    aiVisible.value = false
    ElMessage.error(error.message)
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <div v-loading="loading" class="grade-wrap">
    <section v-if="compliance" class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">毕业设计合规检查</h2>
          <span class="panel-count num">{{ compliance.score }} / 100</span>
        </div>
        <div class="head-actions">
          <el-button v-if="canManage || isAdmin" size="small" @click="generateAdvice">AI 建议</el-button>
          <el-tag :type="complianceTagType" effect="light">{{ compliance.levelLabel }}</el-tag>
        </div>
      </div>

      <div class="compliance-body">
        <div class="compliance-bar">
          <span class="compliance-fill" :style="{ width: `${compliance.score}%` }" />
        </div>

        <ul class="checklist">
          <li v-for="factor in compliance.factors" :key="factor.key" class="check-item">
            <span class="check-dot" :class="{ passed: factor.passed }" />
            <div class="check-main">
              <div class="check-head">
                <span class="check-label">{{ factor.label }}</span>
                <span class="check-weight num">{{ factor.weight }} 分</span>
              </div>
              <p v-if="!factor.passed" class="check-advice">{{ factor.advice }}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">评阅与答辩成绩</h2>
          <el-tag v-if="grade" :type="published ? 'success' : 'info'" effect="light" size="small">
            {{ published ? '已发布' : '草稿' }}
          </el-tag>
        </div>
        <div class="head-actions">
          <el-button v-if="canManage && !published" type="primary" size="small" @click="openEdit">
            {{ grade ? '编辑成绩' : '录入成绩' }}
          </el-button>
          <el-button
            v-if="isAdmin && grade && !published"
            size="small"
            :loading="publishing"
            @click="handlePublish"
          >
            发布成绩
          </el-button>
        </div>
      </div>

      <div v-if="grade" class="grade-body">
        <div class="score-grid">
          <div class="score-item">
            <span class="score-label">导师评分</span>
            <strong class="num">{{ grade.advisorScore ?? '—' }}</strong>
            <span class="score-weight num">30%</span>
          </div>
          <div class="score-item">
            <span class="score-label">评阅评分</span>
            <strong class="num">{{ grade.reviewerScore ?? '—' }}</strong>
            <span class="score-weight num">30%</span>
          </div>
          <div class="score-item">
            <span class="score-label">答辩评分</span>
            <strong class="num">{{ grade.defenseScore ?? '—' }}</strong>
            <span class="score-weight num">40%</span>
          </div>
          <div class="score-item total">
            <span class="score-label">总评</span>
            <strong class="num">
              <AnimatedNumber v-if="grade.finalScore !== null" :value="grade.finalScore" :decimals="1" />
              <template v-else>—</template>
            </strong>
            <span class="score-weight">{{ grade.level || '待计算' }}</span>
          </div>
        </div>

        <dl class="grade-facts">
          <div><dt>查重率</dt><dd class="num">{{ grade.plagiarismRate ?? '—' }}%</dd></div>
          <div><dt>答辩组</dt><dd>{{ grade.defenseGroup || '—' }}</dd></div>
          <div><dt>答辩地点</dt><dd>{{ grade.defenseLocation || '—' }}</dd></div>
          <div><dt>答辩时间</dt><dd class="num">{{ grade.defenseAt ? formatDateTime(grade.defenseAt) : '—' }}</dd></div>
          <div v-if="published"><dt>发布时间</dt><dd class="num">{{ formatDateTime(grade.publishedAt) }}</dd></div>
        </dl>
      </div>

      <EmptyState
        v-else-if="!loading"
        :title="isStudent ? '成绩尚未发布' : '尚未录入成绩'"
        :description="isStudent ? '答辩与评阅完成后，教务会统一发布成绩。' : '录入导师评分、评阅评分与答辩评分后，系统自动计算总评。'"
        :action-text="canManage ? '录入成绩' : ''"
        @action="openEdit"
      />
    </section>

    <el-dialog v-model="aiVisible" title="AI 合规改进建议" width="520px">
      <div v-loading="aiLoading" class="ai-advice">
        <p v-if="aiAdvice" class="ai-text">{{ aiAdvice }}</p>
        <p v-else-if="!aiLoading" class="ai-empty">暂无建议</p>
      </div>
      <template #footer>
        <el-button @click="aiVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="录入评阅与成绩" width="680px">
      <el-form label-position="top">
        <div class="form-grid cols-3">
          <el-form-item label="导师评分（30%）">
            <el-input-number v-model="form.advisorScore" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="评阅评分（30%）">
            <el-input-number v-model="form.reviewerScore" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="答辩评分（40%）">
            <el-input-number v-model="form.defenseScore" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
        </div>

        <div class="preview">
          <span class="preview-label">自动计算总评</span>
          <span class="preview-value num">{{ previewFinal ?? '—' }}</span>
          <span class="preview-level">{{ previewLevel || '三项齐全后计算' }}</span>
        </div>

        <div class="form-grid">
          <el-form-item label="查重率（%）">
            <el-input-number v-model="form.plagiarismRate" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="答辩时间">
            <el-date-picker
              v-model="form.defenseAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择答辩时间"
            />
          </el-form-item>
        </div>

        <div class="form-grid">
          <el-form-item label="答辩组">
            <el-input v-model="form.defenseGroup" maxlength="40" />
          </el-form-item>
          <el-form-item label="答辩地点">
            <el-input v-model="form.defenseLocation" maxlength="60" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitGrade">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.grade-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-count {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.head-actions {
  display: flex;
  gap: 8px;
}

.ai-advice {
  min-height: 80px;
}

.ai-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--text-primary);
  white-space: pre-line;
}

.ai-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-faint);
}

.compliance-body {
  padding: 18px 20px 20px;
}

.compliance-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--line-soft);
  overflow: hidden;
}

.compliance-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--jade-500), var(--jade-300));
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.checklist {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}

.check-item {
  display: flex;
  gap: 10px;
}

.check-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface);
  flex-shrink: 0;
}

.check-dot.passed {
  border-color: var(--moss-600);
  background: var(--moss-600);
  box-shadow: 0 0 0 3px rgba(31, 122, 77, 0.12);
}

.check-main {
  flex: 1;
  min-width: 0;
}

.check-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.check-label {
  font-size: 12.5px;
  color: var(--text-primary);
}

.check-weight {
  font-size: 9.5px;
  color: var(--text-faint);
}

.check-advice {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.grade-body {
  padding: 18px 20px 20px;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--surface);
}

.score-item.total {
  background: var(--surface-soft);
}

.score-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.score-item strong {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.score-item.total strong {
  color: var(--jade-700);
}

.score-weight {
  font-size: 9.5px;
  color: var(--text-faint);
}

.grade-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0 24px;
  margin: 18px 0 0;
  padding: 0;
}

.grade-facts div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line-soft);
  font-size: 11.5px;
}

.grade-facts dt {
  color: var(--text-secondary);
}

.grade-facts dd {
  margin: 0;
  text-align: right;
  color: var(--text-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.preview {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 0 0 18px;
  padding: 12px 14px;
  background: var(--surface-soft);
  border: 1px solid var(--line-soft);
  border-radius: 4px;
}

.preview-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.preview-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--jade-700);
}

.preview-level {
  font-size: 11.5px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .checklist {
    grid-template-columns: 1fr;
  }

  .score-grid {
    grid-template-columns: 1fr 1fr;
  }

  .grade-facts {
    grid-template-columns: 1fr;
  }

  .form-grid,
  .form-grid.cols-3 {
    grid-template-columns: 1fr;
  }
}
</style>
