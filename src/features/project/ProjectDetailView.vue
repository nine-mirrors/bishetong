<script setup>
// ── 项目详情：阶段推进 / 里程碑 / 文档 / 风险 ──
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth.js'
import {
  advanceProjectPhase,
  fetchProjectDetail,
  reviewMilestone,
  submitMilestone,
  uploadProjectDocument,
} from '@/shared/api/project.js'
import { PHASE_NEXT, PHASE_STEPS, PROJECT_PHASE, PROJECT_STATUS } from '@/shared/types/dict.js'
import { formatDate } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import MilestoneList from './components/MilestoneList.vue'
import DocumentPanel from './components/DocumentPanel.vue'
import ProjectRiskPanel from './components/ProjectRiskPanel.vue'
import TaskBookPanel from './components/TaskBookPanel.vue'
import GuidancePanel from './components/GuidancePanel.vue'
import GradePanel from './components/GradePanel.vue'
import ArchivePanel from './components/ArchivePanel.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const project = ref(null)

async function loadProject() {
  loading.value = true
  try {
    project.value = await fetchProjectDetail(route.params.id)
  } catch (error) {
    ElMessage.error(error.message)
    project.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadProject)

const phaseIndex = computed(() =>
  project.value ? PHASE_STEPS.indexOf(project.value.currentPhase) : 0,
)
const nextPhase = computed(() => (project.value ? PHASE_NEXT[project.value.currentPhase] : null))
const risk = computed(() => project.value?.risk || null)

const activeTab = ref('process')
const tabs = [
  { key: 'process', label: '过程管理' },
  { key: 'taskbook', label: '任务书' },
  { key: 'guidance', label: '指导记录' },
  { key: 'grade', label: '评阅与成绩' },
  { key: 'archive', label: '签章归档' },
]

async function handleSubmitMilestone(milestone) {
  try {
    await ElMessageBox.confirm(
      `确认提交「${milestone.name}」？提交后将进入导师批阅。`,
      '提交里程碑',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await submitMilestone(milestone.id)
    ElMessage.success('已提交，等待导师批阅')
    loadProject()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// ── 批阅 ──
const reviewVisible = ref(false)
const reviewTarget = ref(null)
const reviewing = ref(false)
const reviewForm = reactive({ status: 'APPROVED', reviewComment: '' })

function openReview(milestone, status) {
  reviewTarget.value = milestone
  reviewForm.status = status
  reviewForm.reviewComment = ''
  reviewVisible.value = true
}

async function submitReview() {
  if (reviewForm.status === 'REJECTED' && !reviewForm.reviewComment.trim()) {
    ElMessage.warning('退回时请填写修改意见')
    return
  }
  reviewing.value = true
  try {
    await reviewMilestone(reviewTarget.value.id, {
      status: reviewForm.status,
      reviewComment: reviewForm.reviewComment.trim(),
    })
    ElMessage.success(reviewForm.status === 'APPROVED' ? '已通过批阅' : '已退回，学生可重新提交')
    reviewVisible.value = false
    loadProject()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    reviewing.value = false
  }
}

// ── 阶段推进 ──
async function handleAdvancePhase() {
  if (!nextPhase.value) return
  try {
    await ElMessageBox.confirm(
      `确认将项目推进到「${PROJECT_PHASE[nextPhase.value].label}」？阶段只能逐级推进。`,
      '推进阶段',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await advanceProjectPhase(project.value.id, nextPhase.value)
    ElMessage.success('阶段已推进')
    loadProject()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// ── 文档上传 ──
const uploading = ref(false)

async function handleUpload({ file, milestoneId }) {
  uploading.value = true
  try {
    await uploadProjectDocument(project.value.id, { file, milestoneId })
    ElMessage.success('上传成功')
    loadProject()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    uploading.value = false
  }
}

function goBack() {
  router.push({ name: 'Projects' })
}
</script>

<template>
  <div v-loading="loading" class="page">
    <template v-if="project">
      <button type="button" class="back" @click="goBack">← 返回项目列表</button>

      <section class="hero">
        <div class="hero-head">
          <div class="hero-copy">
            <p class="eyebrow">PROJECT / {{ PROJECT_PHASE[project.currentPhase].label }}</p>
            <h1 class="hero-title">{{ project.title }}</h1>
            <p class="hero-desc">{{ project.topic?.description || '暂无课题简介' }}</p>
          </div>
          <div class="hero-side">
            <el-tag :type="PROJECT_STATUS[project.status].elType" effect="light" size="large">
              {{ PROJECT_STATUS[project.status].label }}
            </el-tag>
            <el-button
              v-if="auth.canManage && nextPhase"
              type="primary"
              size="small"
              @click="handleAdvancePhase"
            >
              推进到{{ PROJECT_PHASE[nextPhase].label }}
            </el-button>
          </div>
        </div>

        <div class="meta-row">
          <div class="meta">
            <span class="meta-label">学生</span>
            <span class="meta-value">
              {{ project.student.name }} · {{ project.student.studentNo || '未填写学号' }}
            </span>
          </div>
          <div class="meta">
            <span class="meta-label">导师</span>
            <span class="meta-value">{{ project.advisor.name }}</span>
          </div>
          <div class="meta">
            <span class="meta-label">立项</span>
            <span class="meta-value num">{{ formatDate(project.startDate || project.createdAt) }}</span>
          </div>
          <div class="meta">
            <span class="meta-label">阶段</span>
            <span class="meta-value">{{ PROJECT_PHASE[project.currentPhase].label }}</span>
          </div>
        </div>

        <el-steps :active="phaseIndex" finish-status="success" align-center class="steps">
          <el-step title="选题" />
          <el-step title="开题" />
          <el-step title="中期" />
          <el-step title="答辩" />
          <el-step title="归档" />
        </el-steps>
      </section>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div v-if="activeTab === 'process'" class="detail-grid">
        <div class="detail-main">
          <MilestoneList
            :milestones="project.milestones"
            :is-student="auth.isStudent"
            :can-manage="auth.canManage"
            @submit="handleSubmitMilestone"
            @review="openReview"
          />

          <DocumentPanel
            :project-id="project.id"
            :documents="project.documents"
            :milestones="project.milestones"
            :uploading="uploading"
            @upload="handleUpload"
            @refresh="loadProject"
          />
        </div>

        <aside class="detail-rail">
          <ProjectRiskPanel :risk="risk" />

          <section class="panel">
            <div class="panel-head">
              <h2 class="section-title">项目档案</h2>
            </div>
            <dl class="facts">
              <div><dt>课题编号</dt><dd class="num">{{ project.id.slice(-8).toUpperCase() }}</dd></div>
              <div><dt>所属专题</dt><dd>{{ project.topic?.title || '—' }}</dd></div>
              <div><dt>指导导师</dt><dd>{{ project.advisor.name }} · {{ project.advisor.department || '—' }}</dd></div>
              <div><dt>学生院系</dt><dd>{{ project.student.department || '—' }}</dd></div>
              <div><dt>项目创建</dt><dd class="num">{{ formatDate(project.createdAt) }}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <TaskBookPanel
        v-else-if="activeTab === 'taskbook'"
        :project-id="project.id"
        :is-student="auth.isStudent"
        :can-manage="auth.canManage"
      />

      <GuidancePanel
        v-else-if="activeTab === 'guidance'"
        :project-id="project.id"
        :is-student="auth.isStudent"
        :can-manage="auth.canManage"
      />

      <GradePanel
        v-else-if="activeTab === 'grade'"
        :project-id="project.id"
        :is-student="auth.isStudent"
        :can-manage="auth.canManage"
        :is-admin="auth.isAdmin"
      />

      <ArchivePanel
        v-else-if="activeTab === 'archive'"
        :project-id="project.id"
        :is-admin="auth.isAdmin"
      />

      <el-dialog
        v-model="reviewVisible"
        :title="reviewForm.status === 'APPROVED' ? '通过里程碑' : '退回里程碑'"
        width="480px"
      >
        <div class="dialog-target">
          <span class="dialog-label">{{ reviewForm.status === 'APPROVED' ? 'APPROVE' : 'REJECT' }}</span>
          <p class="dialog-title">{{ reviewTarget?.name }}</p>
        </div>
        <el-input
          v-model="reviewForm.reviewComment"
          type="textarea"
          :rows="4"
          maxlength="200"
          show-word-limit
          :placeholder="reviewForm.status === 'APPROVED' ? '可选，例如：材料完整，同意通过' : '必填，说明需要修改的内容'"
        />
        <template #footer>
          <el-button @click="reviewVisible = false">取消</el-button>
          <el-button
            :type="reviewForm.status === 'APPROVED' ? 'primary' : 'danger'"
            :loading="reviewing"
            @click="submitReview"
          >
            确认{{ reviewForm.status === 'APPROVED' ? '通过' : '退回' }}
          </el-button>
        </template>
      </el-dialog>
    </template>

    <div v-else-if="!loading" class="missing">
      <EmptyState
        title="项目不存在或无权访问"
        description="该项目可能已被归档，或当前账号没有查看权限。"
        action-text="返回项目列表"
        @action="goBack"
      />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 300px;
}

.back {
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.back:hover {
  color: var(--jade-600);
}

.hero {
  padding: 26px 28px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--border-radius-base);
  box-shadow: var(--shadow-sm);
}

.hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.hero-title {
  margin: 0;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.hero-desc {
  max-width: 720px;
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.hero-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 6px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-top: 22px;
  padding: 16px 0;
  border-top: 1px solid var(--line-soft);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--text-faint);
}

.meta-value {
  font-size: 12.5px;
  color: var(--text-primary);
}

.steps {
  margin-top: 8px;
}

.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--line);
}

.tab {
  position: relative;
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.18s ease;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--text-primary);
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--jade-600);
}

.missing {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--border-radius-base);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;
}

.detail-main,
.detail-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.facts {
  margin: 0;
  padding: 6px 20px 16px;
}

.facts div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line-soft);
  font-size: 11.5px;
}

.facts div:last-child {
  border-bottom: none;
}

.facts dt {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.facts dd {
  margin: 0;
  text-align: right;
  color: var(--text-primary);
}

.dialog-target {
  margin-bottom: 16px;
  padding: 14px;
  background: var(--surface-soft);
  border: 1px solid var(--line-soft);
  border-radius: 4px;
}

.dialog-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--text-faint);
}

.dialog-title {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 1080px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-rail {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .detail-rail > .panel {
    flex: 1 1 300px;
  }
}

@media (max-width: 768px) {
  .hero-head {
    flex-direction: column;
  }

  .meta-row {
    gap: 20px;
  }
}
</style>
