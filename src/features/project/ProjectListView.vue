<script setup>
// ── 项目列表 ──
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.js'
import { fetchProjects, remindProjects } from '@/shared/api/project.js'
import { downloadCsv } from '@/shared/api/export.js'
import {
  PROJECT_PHASE,
  PROJECT_PHASE_OPTIONS,
  PROJECT_STATUS,
  RISK_LEVEL,
} from '@/shared/types/dict.js'
import { formatDate } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const selectedIds = ref([])
const query = reactive({ keyword: '', phase: '', status: '', page: 1, pageSize: 10 })

async function loadProjects() {
  loading.value = true
  try {
    const result = await fetchProjects(query)
    rows.value = result.list
    total.value = result.total
    selectedIds.value = []
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadProjects()
}

function handleReset() {
  query.keyword = ''
  query.phase = ''
  query.status = ''
  query.page = 1
  loadProjects()
}

function handlePageChange(page) {
  query.page = page
  loadProjects()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.page = 1
  loadProjects()
}

function handleSelectionChange(selection) {
  selectedIds.value = selection.map((item) => item.id)
}

function handleRowClick(row, _column, event) {
  if (event?.target?.closest('.el-checkbox')) return
  openDetail(row)
}

async function handleRemind() {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `将向选中的 ${selectedIds.value.length} 个项目学生发送进度提醒，确认继续？`,
      '批量催办',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const result = await remindProjects(selectedIds.value)
    ElMessage.success(`已发送 ${result.sent} 条催办通知`)
    selectedIds.value = []
    loadProjects()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function handleExport() {
  try {
    const date = new Date().toISOString().slice(0, 10)
    await downloadCsv('/export/projects.csv', `projects-${date}.csv`)
    ElMessage.success('导出已开始')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function openDetail(row) {
  router.push({ name: 'ProjectDetail', params: { id: row.id } })
}

function progressText(row) {
  const approved = row.milestones.filter((item) => item.status === 'APPROVED').length
  return `${approved}/${row.milestones.length}`
}

function riskColor(level) {
  return RISK_LEVEL[level].color
}

onMounted(loadProjects)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">PROJECT PORTFOLIO</p>
        <h1 class="page-title">{{ auth.canManage ? '学生项目' : '我的项目' }}</h1>
        <p class="page-sub">阶段、里程碑与风险集中在一张表里，点击行查看完整进度。</p>
      </div>
      <div class="page-head-actions">
        <span class="head-meta num">{{ total }} PROJECTS</span>
      </div>
    </header>

    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        class="search"
        placeholder="搜索项目名称或学生"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="query.phase" class="filter" placeholder="全部阶段" @change="handleSearch">
        <el-option
          v-for="item in PROJECT_PHASE_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="query.status" class="filter" placeholder="全部状态" @change="handleSearch">
        <el-option label="全部" value="" />
        <el-option label="进行中" value="ACTIVE" />
        <el-option label="已完成" value="COMPLETED" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button text @click="handleReset">重置</el-button>
      <div class="toolbar-spacer" />
      <el-button v-if="auth.canManage && selectedIds.length" type="warning" @click="handleRemind">
        批量催办（{{ selectedIds.length }}）
      </el-button>
      <el-button v-if="auth.canManage" @click="handleExport">导出 CSV</el-button>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">项目列表</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">风险分越高越需要关注</span>
      </div>

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="rows"
          empty-text="暂无项目"
          row-class-name="clickable-row"
          @row-click="handleRowClick"
          @selection-change="handleSelectionChange"
        >
          <template #empty>
            <EmptyState
              title="暂无项目"
              description="学生申请通过后会自动立项，也可以调整筛选条件。"
            />
          </template>
          <el-table-column v-if="auth.canManage" type="selection" width="46" />
          <el-table-column label="项目" min-width="270">
            <template #default="{ row }">
              <div class="project-title">{{ row.title }}</div>
              <div class="cell-sub">
                立项 {{ formatDate(row.startDate || row.createdAt) }} · 导师 {{ row.advisor.name }}
              </div>
            </template>
          </el-table-column>

          <el-table-column v-if="auth.canManage" label="学生" width="140">
            <template #default="{ row }">
              <div class="cell-main">{{ row.student.name }}</div>
              <div class="cell-sub num">{{ row.student.studentNo || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="阶段" width="110">
            <template #default="{ row }">
              <el-tag :type="PROJECT_PHASE[row.currentPhase].elType" effect="light">
                {{ PROJECT_PHASE[row.currentPhase].label }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="里程碑" width="100">
            <template #default="{ row }">
              <span class="num milestone">{{ progressText(row) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="风险" width="170">
            <template #default="{ row }">
              <div class="risk">
                <span class="risk-track">
                  <span
                    class="risk-fill"
                    :style="{ width: `${row.risk.score}%`, background: riskColor(row.risk.level) }"
                  />
                </span>
                <span class="risk-text num" :style="{ color: riskColor(row.risk.level) }">
                  {{ row.risk.score }}
                </span>
                <span class="risk-level">{{ row.risk.levelLabel }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="PROJECT_STATUS[row.status].elType" effect="plain">
                {{ PROJECT_STATUS[row.status].label }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="" width="56" align="right">
            <template #default>
              <span class="arrow">→</span>
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
  </div>
</template>

<style scoped>
.head-meta {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.search {
  width: 240px;
}

.filter {
  width: 150px;
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

.table-wrap :deep(.clickable-row) {
  cursor: pointer;
}

.panel-foot {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--line-soft);
}

.project-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.cell-main {
  font-size: 13px;
  color: var(--text-primary);
}

.cell-sub {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-faint);
}

.milestone {
  font-size: 12.5px;
  color: var(--text-regular);
}

.risk {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-track {
  width: 54px;
  height: 4px;
  border-radius: 2px;
  background: var(--line-soft);
  overflow: hidden;
}

.risk-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
}

.risk-text {
  font-size: 12px;
  font-weight: 600;
}

.risk-level {
  font-size: 10.5px;
  color: var(--text-faint);
}

.arrow {
  color: var(--text-faint);
  font-size: 14px;
}
</style>
