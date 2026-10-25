<script setup>
// ── 审计日志（教务） ──
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchLogs } from '@/shared/api/log.js'
import {
  ACTION_LABELS,
  ACTION_OPTIONS,
  ROLE,
  TARGET_TYPE_LABELS,
} from '@/shared/types/dict.js'
import EmptyState from '@/shared/components/EmptyState.vue'
import { formatDateTime } from '@/shared/utils/format.js'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ action: '', page: 1, pageSize: 20 })

async function loadLogs() {
  loading.value = true
  try {
    const result = await fetchLogs(query)
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
  loadLogs()
}

function handlePageChange(page) {
  query.page = page
  loadLogs()
}

onMounted(loadLogs)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">AUDIT TRAIL</p>
        <h1 class="page-title">审计日志</h1>
        <p class="page-sub">记录申请、批阅、用户与催办等关键操作，用于追责与问题回溯。</p>
      </div>
      <div class="page-head-actions">
        <span class="head-meta num">{{ total }} EVENTS</span>
      </div>
    </header>

    <div class="toolbar">
      <el-select v-model="query.action" class="filter" placeholder="全部动作" @change="handleSearch">
        <el-option
          v-for="item in ACTION_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button @click="handleSearch">刷新</el-button>
      <div class="toolbar-spacer" />
      <span class="toolbar-meta">按时间倒序</span>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">操作记录</h2>
          <span class="panel-count num">{{ total }} ITEMS</span>
        </div>
        <span class="panel-note">只读，不可编辑</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="rows" empty-text="暂无操作记录">
          <template #empty>
            <EmptyState title="暂无操作记录" description="系统产生业务操作后，这里会自动留痕。" />
          </template>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">
              <span class="date num">{{ formatDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作人" width="160">
            <template #default="{ row }">
              <div class="cell-main">{{ row.user?.name || '已删除用户' }}</div>
              <div class="cell-sub">{{ ROLE[row.user?.role]?.label || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="动作" min-width="180">
            <template #default="{ row }">
              <span class="action">
                <span class="action-dot" />
                {{ ACTION_LABELS[row.action] || row.action }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="对象" width="140">
            <template #default="{ row }">
              {{ TARGET_TYPE_LABELS[row.targetType] || row.targetType }}
            </template>
          </el-table-column>

          <el-table-column label="对象 ID" min-width="220">
            <template #default="{ row }">
              <span class="object-id num">{{ row.targetId }}</span>
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
.head-meta,
.toolbar-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.filter {
  width: 180px;
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
  font-size: 11px;
  color: var(--text-secondary);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-primary);
}

.action-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jade-500);
}

.object-id {
  font-size: 10.5px;
  color: var(--text-faint);
}

@media (max-width: 768px) {
  .filter {
    width: 150px;
  }
}
</style>
