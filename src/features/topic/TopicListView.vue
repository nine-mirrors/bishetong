<script setup>
// ── 课题中心：浏览 / 发布 / 申请 ──
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth.js'
import { applyTopic, createTopic, fetchTopics } from '@/shared/api/topic.js'
import { TOPIC_STATUS, TOPIC_STATUS_OPTIONS, APPLICATION_STATUS } from '@/shared/types/dict.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import { formatDate } from '@/shared/utils/format.js'

const route = useRoute()
const auth = useAuthStore()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({
  keyword: String(route.query.keyword || ''),
  status: '',
  page: 1,
  pageSize: 10,
})

const availableCount = computed(
  () => rows.value.filter((row) => row.status === 'OPEN' && row.approvedCount < row.capacity).length,
)

async function loadTopics() {
  loading.value = true
  try {
    const result = await fetchTopics(query)
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
  loadTopics()
}

function handleReset() {
  query.keyword = ''
  query.status = ''
  query.page = 1
  loadTopics()
}

function handlePageChange(page) {
  query.page = page
  loadTopics()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.page = 1
  loadTopics()
}

onMounted(loadTopics)

// 全局搜索跳转时同步关键词
watch(
  () => route.query.keyword,
  (value) => {
    if (value === undefined) return
    query.keyword = String(value)
    query.page = 1
    loadTopics()
  },
)

// ── 学生申请 ──
const applyVisible = ref(false)
const applyTarget = ref(null)
const statement = ref('')
const applying = ref(false)

function openApply(row) {
  applyTarget.value = row
  statement.value = ''
  applyVisible.value = true
}

async function submitApply() {
  const text = statement.value.trim()
  if (text.length < 10) {
    ElMessage.warning('申请理由至少 10 个字')
    return
  }
  applying.value = true
  try {
    await applyTopic(applyTarget.value.id, text)
    ElMessage.success('申请已提交，等待导师审核')
    applyVisible.value = false
    loadTopics()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    applying.value = false
  }
}

// ── 导师 / 教务发布课题 ──
const createVisible = ref(false)
const createRef = ref(null)
const creating = ref(false)
const createForm = reactive({ title: '', description: '', capacity: 1 })

const createRules = {
  title: [{ required: true, message: '请输入课题名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入课题简介', trigger: 'blur' }],
  capacity: [{ required: true, message: '请设置名额', trigger: 'change' }],
}

function openCreate() {
  createVisible.value = true
}

async function submitCreate() {
  if (!createRef.value) return
  const valid = await createRef.value.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    await createTopic({ ...createForm })
    ElMessage.success('课题已发布')
    createVisible.value = false
    createForm.title = ''
    createForm.description = ''
    createForm.capacity = 1
    handleReset()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    creating.value = false
  }
}

function canApply(row) {
  return auth.isStudent && !row.myApplication && row.status === 'OPEN' && row.approvedCount < row.capacity
}

function applyHint(row) {
  if (row.status !== 'OPEN') return '已关闭'
  if (row.approvedCount >= row.capacity) return '名额已满'
  return ''
}

function seatPercent(row) {
  return Math.min(100, Math.round((row.approvedCount / row.capacity) * 100))
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">COURSE CATALOG</p>
        <h1 class="page-title">课题中心</h1>
        <p class="page-sub">
          {{ auth.canManage ? '发布课题、维护名额，并审核学生提交的申请。' : '浏览导师课题，提交申请，通过后自动进入项目阶段。' }}
        </p>
      </div>
      <div class="page-head-actions">
        <el-button v-if="auth.canManage" type="primary" @click="openCreate">发布课题</el-button>
      </div>
    </header>

    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        class="search"
        placeholder="搜索课题名称或简介"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="query.status" class="status-select" placeholder="全部状态">
        <el-option
          v-for="item in TOPIC_STATUS_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button text @click="handleReset">重置</el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-meta num">本页 {{ availableCount }} 个可申请</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">课题列表</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">按发布时间倒序</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="rows" empty-text="没有符合条件的课题">
          <template #empty>
            <EmptyState
              title="没有符合条件的课题"
              description="调整搜索条件，或由导师发布新的课题。"
            />
          </template>
          <el-table-column label="课题" min-width="300">
            <template #default="{ row }">
              <div class="topic-title">{{ row.title }}</div>
              <div class="topic-desc">{{ row.description }}</div>
            </template>
          </el-table-column>

          <el-table-column label="导师" width="150">
            <template #default="{ row }">
              <div class="cell-main">{{ row.advisor.name }}</div>
              <div class="cell-sub">{{ row.advisor.department || '未填写院系' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="名额" width="130">
            <template #default="{ row }">
              <div class="seat">
                <span class="seat-num num" :class="{ full: row.approvedCount >= row.capacity }">
                  {{ row.approvedCount }}<i>/</i>{{ row.capacity }}
                </span>
                <span class="seat-track">
                  <span class="seat-fill" :style="{ width: `${seatPercent(row)}%` }" />
                </span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="TOPIC_STATUS[row.status].elType" effect="light">
                {{ TOPIC_STATUS[row.status].label }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="发布日期" width="130">
            <template #default="{ row }">
              <span class="date num">{{ formatDate(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="140" align="right">
            <template #default="{ row }">
              <template v-if="auth.isStudent">
                <el-tag
                  v-if="row.myApplication"
                  :type="APPLICATION_STATUS[row.myApplication.status].elType"
                  effect="plain"
                >
                  {{ APPLICATION_STATUS[row.myApplication.status].label }}
                </el-tag>
                <el-button v-else-if="canApply(row)" type="primary" size="small" @click="openApply(row)">
                  申请课题
                </el-button>
                <span v-else class="cell-sub">{{ applyHint(row) }}</span>
              </template>
              <span v-else class="cell-sub">—</span>
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

    <el-dialog v-model="applyVisible" title="申请课题" width="520px">
      <div class="dialog-target">
        <span class="dialog-label">TARGET TOPIC</span>
        <p class="dialog-title">{{ applyTarget?.title }}</p>
        <p class="dialog-meta">
          {{ applyTarget?.advisor.name }} · 剩余名额
          {{ (applyTarget?.capacity || 0) - (applyTarget?.approvedCount || 0) }}
        </p>
      </div>
      <el-input
        v-model="statement"
        type="textarea"
        :rows="5"
        maxlength="300"
        show-word-limit
        placeholder="简要说明你的基础、兴趣和计划（至少 10 个字）"
      />
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="applying" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createVisible" title="发布课题" width="560px">
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="课题名称" prop="title">
          <el-input v-model="createForm.title" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="课题简介" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="研究内容、预期成果、对学生的要求"
          />
        </el-form-item>
        <el-form-item label="名额" prop="capacity">
          <el-input-number v-model="createForm.capacity" :min="1" :max="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search {
  width: 300px;
}

.status-select {
  width: 150px;
}

.toolbar-meta {
  font-size: 10.5px;
  letter-spacing: 0.08em;
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

.topic-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.topic-desc {
  margin-top: 4px;
  max-width: 460px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cell-main {
  font-size: 13px;
  color: var(--text-primary);
}

.cell-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-faint);
}

.date {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.seat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.seat-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.seat-num i {
  margin: 0 2px;
  font-style: normal;
  color: var(--text-faint);
}

.seat-num.full {
  color: var(--clay-600);
}

.seat-track {
  width: 64px;
  height: 3px;
  border-radius: 2px;
  background: var(--line-soft);
  overflow: hidden;
}

.seat-fill {
  display: block;
  height: 100%;
  background: var(--jade-600);
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
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .search {
    width: 100%;
  }

  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
