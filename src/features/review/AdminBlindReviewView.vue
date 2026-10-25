<script setup>
// ── 盲审抽检（教务） ──
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteBlindReview,
  fetchBlindReviews,
  fetchBlindStats,
  sampleBlindReviews,
} from '@/shared/api/blindReview.js'
import { formatDateTime } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const loading = ref(false)
const sampling = ref(false)
const rows = ref([])
const total = ref(0)
const stats = ref({ total: 0, submitted: 0, pending: 0, average: null })
const sampleCount = ref(3)
const query = reactive({ page: 1, pageSize: 10 })

const statusMap = {
  ASSIGNED: { label: '待评阅', type: 'warning' },
  SUBMITTED: { label: '已提交', type: 'success' },
}

async function loadData() {
  loading.value = true
  try {
    const [statsData, listData] = await Promise.all([
      fetchBlindStats(),
      fetchBlindReviews(query),
    ])
    stats.value = statsData
    rows.value = listData.list
    total.value = listData.total
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

async function handleSample() {
  if (!sampleCount.value) return
  try {
    await ElMessageBox.confirm(
      `将从“成绩已发布且未抽检”的项目中随机抽取 ${sampleCount.value} 篇，并自动分配评阅教师，确认继续？`,
      '随机抽检',
      { type: 'warning' },
    )
  } catch {
    return
  }
  sampling.value = true
  try {
    const result = await sampleBlindReviews(sampleCount.value)
    ElMessage.success(`已抽取 ${result.created} 篇并完成分配`)
    query.page = 1
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    sampling.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认撤销 ${row.anonymousCode} 的盲审任务？`, '撤销盲审', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteBlindReview(row.id)
    ElMessage.success('已撤销')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

function handlePageChange(page) {
  query.page = page
  loadData()
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">BLIND REVIEW</p>
        <h1 class="page-title">盲审抽检</h1>
        <p class="page-sub">从成绩已发布且未抽检的项目中随机抽取，自动分配给非本人导师的评阅教师。</p>
      </div>
      <div class="page-head-actions">
        <el-input-number v-model="sampleCount" :min="1" :max="20" controls-position="right" />
        <el-button type="primary" :loading="sampling" @click="handleSample">随机抽取</el-button>
      </div>
    </header>

    <div class="stat-strip">
      <div class="stat-cell"><span class="stat-label">盲审总量</span><strong class="num">{{ stats.total }}</strong></div>
      <div class="stat-cell"><span class="stat-label">已提交</span><strong class="num">{{ stats.submitted }}</strong></div>
      <div class="stat-cell"><span class="stat-label">待评阅</span><strong class="num">{{ stats.pending }}</strong></div>
      <div class="stat-cell"><span class="stat-label">平均分</span><strong class="num">{{ stats.average ?? '—' }}</strong></div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">盲审任务</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">评阅教师看不到学生与导师信息</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="rows" empty-text="暂无盲审任务">
          <template #empty>
            <EmptyState title="暂无盲审任务" description="发布成绩后，使用右上角“随机抽取”创建任务。" />
          </template>
          <el-table-column label="匿名编号" width="160">
            <template #default="{ row }"><span class="code num">{{ row.anonymousCode }}</span></template>
          </el-table-column>
          <el-table-column label="项目" min-width="260">
            <template #default="{ row }">{{ row.project.title }}</template>
          </el-table-column>
          <el-table-column label="评阅教师" width="140">
            <template #default="{ row }">{{ row.reviewer.name }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusMap[row.status].type" effect="light">{{ statusMap[row.status].label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="评分" width="90">
            <template #default="{ row }"><span class="num">{{ row.score ?? '—' }}</span></template>
          </el-table-column>
          <el-table-column label="分配时间" width="160">
            <template #default="{ row }"><span class="num date">{{ formatDateTime(row.assignedAt) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="handleDelete(row)">撤销</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="panel-foot">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.page"
          :page-size="query.pageSize"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 5px;
  overflow: hidden;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  background: var(--surface);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-cell strong {
  font-size: 24px;
  font-weight: 700;
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
  font-size: 10.5px;
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

.code {
  font-size: 11px;
  color: var(--jade-700);
  padding: 3px 8px;
  background: var(--jade-100);
  border-radius: 3px;
}

.date {
  font-size: 10.5px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .stat-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
