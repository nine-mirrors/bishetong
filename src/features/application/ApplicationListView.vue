<script setup>
// ── 课题申请：学生查看 / 导师与教务审核 ──
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.js'
import { fetchApplications, reviewApplication } from '@/shared/api/application.js'
import { downloadCsv } from '@/shared/api/export.js'
import { APPLICATION_STATUS, APPLICATION_STATUS_OPTIONS } from '@/shared/types/dict.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import { formatDateTime } from '@/shared/utils/format.js'

const auth = useAuthStore()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ status: '', page: 1, pageSize: 10 })

const pendingCount = computed(() => rows.value.filter((row) => row.status === 'PENDING').length)

async function loadApplications() {
  loading.value = true
  try {
    const result = await fetchApplications(query)
    rows.value = result.list
    total.value = result.total
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadApplications()
}

function handlePageChange(page) {
  query.page = page
  loadApplications()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.page = 1
  loadApplications()
}

function initial(name) {
  return (name || '?').slice(0, 1)
}

async function handleExport() {
  try {
    const date = new Date().toISOString().slice(0, 10)
    await downloadCsv('/export/applications.csv', `applications-${date}.csv`)
    ElMessage.success('导出已开始')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

onMounted(loadApplications)

// ── 审核 ──
const reviewVisible = ref(false)
const reviewTarget = ref(null)
const reviewing = ref(false)
const reviewForm = reactive({ action: 'APPROVED', reviewComment: '' })

function openReview(row, action) {
  reviewTarget.value = row
  reviewForm.action = action
  reviewForm.reviewComment = ''
  reviewVisible.value = true
}

async function submitReview() {
  if (reviewForm.action === 'REJECTED' && !reviewForm.reviewComment.trim()) {
    ElMessage.warning('退回时请填写原因，便于学生修改')
    return
  }

  reviewing.value = true
  try {
    await reviewApplication(reviewTarget.value.id, {
      action: reviewForm.action,
      reviewComment: reviewForm.reviewComment.trim(),
    })
    ElMessage.success(reviewForm.action === 'APPROVED' ? '已通过，并自动创建项目' : '已退回')
    reviewVisible.value = false
    loadApplications()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    reviewing.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">{{ auth.canManage ? 'REVIEW QUEUE' : 'MY APPLICATIONS' }}</p>
        <h1 class="page-title">{{ auth.canManage ? '申请审核' : '我的申请' }}</h1>
        <p class="page-sub">
          {{
            auth.canManage
              ? '通过后系统在同一事务内立项，并生成开题、中期、答辩三个里程碑。'
              : '查看已提交的课题申请与导师审核意见。'
          }}
        </p>
      </div>
      <div class="page-head-actions">
        <span class="queue-hint num">
          {{ auth.canManage ? `本页待处理 ${pendingCount}` : `共 ${total} 条申请` }}
        </span>
      </div>
    </header>

    <div class="toolbar">
      <el-select v-model="query.status" class="status-select" placeholder="全部状态" @change="handleSearch">
        <el-option
          v-for="item in APPLICATION_STATUS_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button @click="handleSearch">刷新</el-button>
      <el-button v-if="auth.canManage" @click="handleExport">导出 CSV</el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-meta num">{{ total }} RECORDS</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">申请记录</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">按提交时间倒序</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="rows" empty-text="暂无申请记录">
          <template #empty>
            <EmptyState
              :title="auth.canManage ? '暂无待审核申请' : '还没有提交过申请'"
              :description="auth.canManage ? '学生提交申请后会出现在这里。' : '去课题中心选择感兴趣的课题并提交申请。'"
            />
          </template>
          <el-table-column label="学生" width="170">
            <template #default="{ row }">
              <div class="student">
                <span class="student-avatar">{{ initial(row.student.name) }}</span>
                <div>
                  <div class="cell-main">{{ row.student.name }}</div>
                  <div class="cell-sub num">{{ row.student.studentNo || '—' }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="课题" min-width="190">
            <template #default="{ row }">
              <div class="cell-main">{{ row.topic.title }}</div>
              <div class="cell-sub">导师 {{ row.topic.advisor.name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="申请理由" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="statement">{{ row.statement }}</span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="APPLICATION_STATUS[row.status].elType" effect="light">
                {{ APPLICATION_STATUS[row.status].label }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="审核意见" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="row.reviewComment ? 'review-text' : 'cell-sub'">
                {{ row.reviewComment || '—' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="提交时间" width="150">
            <template #default="{ row }">
              <span class="date num">{{ formatDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column v-if="auth.canManage" label="操作" width="140" align="right">
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button type="primary" size="small" @click="openReview(row, 'APPROVED')">通过</el-button>
                <el-button type="danger" size="small" text @click="openReview(row, 'REJECTED')">退回</el-button>
              </template>
              <span v-else class="cell-sub">已处理</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="panel-foot">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog
      v-model="reviewVisible"
      :title="reviewForm.action === 'APPROVED' ? '通过申请' : '退回申请'"
      width="500px"
    >
      <div class="dialog-target">
        <span class="dialog-label">{{ reviewForm.action === 'APPROVED' ? 'APPROVE' : 'REJECT' }}</span>
        <p class="dialog-title">{{ reviewTarget?.student.name }} · {{ reviewTarget?.topic.title }}</p>
        <p class="dialog-meta">{{ reviewTarget?.statement }}</p>
      </div>
      <el-input
        v-model="reviewForm.reviewComment"
        type="textarea"
        :rows="4"
        maxlength="200"
        show-word-limit
        :placeholder="reviewForm.action === 'APPROVED' ? '可选，例如：基础不错，同意开题' : '必填，说明需要修改的地方'"
      />
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button
          :type="reviewForm.action === 'APPROVED' ? 'primary' : 'danger'"
          :loading="reviewing"
          @click="submitReview"
        >
          确认{{ reviewForm.action === 'APPROVED' ? '通过' : '退回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.status-select {
  width: 160px;
}

.queue-hint,
.toolbar-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.panel-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-count {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.panel-note {
  font-size: 11px;
  color: var(--text-faint);
}

.table-wrap {
  padding: 0 20px;
}

.panel-foot {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--line-soft);
}

.student {
  display: flex;
  align-items: center;
  gap: 10px;
}

.student-avatar {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--jade-100);
  color: var(--jade-700);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.cell-main {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.cell-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-faint);
}

.statement {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-regular);
}

.review-text {
  font-size: 12px;
  color: var(--text-regular);
}

.date {
  font-size: 11px;
  color: var(--text-secondary);
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
  margin: 8px 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.dialog-meta {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 768px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
