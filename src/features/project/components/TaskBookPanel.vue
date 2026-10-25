<script setup>
// ── 项目详情 · 任务书 ──
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmTaskBook, fetchTaskBook, saveTaskBook } from '@/shared/api/project.js'
import { formatDateTime } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  isStudent: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
})

const loading = ref(false)
const taskBook = ref(null)

const statusMap = {
  DRAFT: { label: '草稿', type: 'info' },
  ISSUED: { label: '待学生确认', type: 'warning' },
  CONFIRMED: { label: '已确认', type: 'success' },
}

async function loadTaskBook() {
  loading.value = true
  try {
    taskBook.value = await fetchTaskBook(props.projectId)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadTaskBook)
watch(() => props.projectId, loadTaskBook)

const editVisible = ref(false)
const saving = ref(false)
const form = reactive({ content: '', requirements: '' })

function openEdit() {
  form.content = taskBook.value?.content || ''
  form.requirements = taskBook.value?.requirements || ''
  editVisible.value = true
}

async function submitTaskBook() {
  if (form.content.trim().length < 20) {
    ElMessage.warning('任务书内容至少 20 个字')
    return
  }
  saving.value = true
  try {
    taskBook.value = await saveTaskBook(props.projectId, {
      content: form.content.trim(),
      requirements: form.requirements.trim(),
    })
    ElMessage.success('任务书已下达')
    editVisible.value = false
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

async function handleConfirm() {
  try {
    taskBook.value = await confirmTaskBook(props.projectId)
    ElMessage.success('任务书已确认')
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <section v-loading="loading" class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <h2 class="section-title">任务书</h2>
        <el-tag v-if="taskBook" :type="statusMap[taskBook.status].type" effect="light" size="small">
          {{ statusMap[taskBook.status].label }}
        </el-tag>
      </div>
      <div class="head-actions">
        <el-button v-if="isStudent && taskBook?.status === 'ISSUED'" type="primary" size="small" @click="handleConfirm">
          确认任务书
        </el-button>
        <el-button v-if="canManage" size="small" @click="openEdit">
          {{ taskBook ? '修改并重新下达' : '下达任务书' }}
        </el-button>
      </div>
    </div>

    <div v-if="taskBook" class="taskbook">
      <div class="meta-row">
        <span class="num">下达：{{ taskBook.issuedAt ? formatDateTime(taskBook.issuedAt) : '—' }}</span>
        <span class="num">确认：{{ taskBook.confirmedAt ? formatDateTime(taskBook.confirmedAt) : '未确认' }}</span>
      </div>

      <h3 class="block-title">研究内容与目标</h3>
      <p class="content">{{ taskBook.content }}</p>

      <template v-if="taskBook.requirements">
        <h3 class="block-title">任务要求</h3>
        <p class="content pre">{{ taskBook.requirements }}</p>
      </template>
    </div>

    <EmptyState
      v-else-if="!loading"
      title="导师尚未下达任务书"
      :description="canManage ? '下达任务书后，学生可在系统中确认。' : '请等待导师下达任务书。'"
      :action-text="canManage ? '下达任务书' : ''"
      @action="openEdit"
    />

    <el-dialog v-model="editVisible" title="下达任务书" width="640px">
      <el-form label-position="top">
        <el-form-item label="研究内容与目标">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="说明研究内容、目标与预期成果"
          />
        </el-form-item>
        <el-form-item label="任务要求（可选）">
          <el-input
            v-model="form.requirements"
            type="textarea"
            :rows="4"
            maxlength="600"
            show-word-limit
            placeholder="文献阅读、周记录、论文字数、系统功能等要求"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitTaskBook">下达任务书</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.taskbook {
  padding: 20px;
}

.meta-row {
  display: flex;
  gap: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 11px;
  color: var(--text-secondary);
}

.block-title {
  margin: 20px 0 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
  font-weight: 500;
}

.content {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--text-primary);
}

.content.pre {
  white-space: pre-line;
  color: var(--text-regular);
}
</style>
