<script setup>
// ── 项目详情 · 指导记录 ──
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createGuidance, fetchGuidance, feedbackGuidance } from '@/shared/api/project.js'
import { aiAssist } from '@/shared/api/ai.js'
import { formatDateTime } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  isStudent: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
})

const loading = ref(false)
const records = ref([])

const nextWeek = computed(() => {
  if (records.value.length === 0) return 1
  return Math.min(30, Math.max(...records.value.map((item) => item.weekNo)) + 1)
})

async function loadGuidance() {
  loading.value = true
  try {
    records.value = await fetchGuidance(props.projectId)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadGuidance)
watch(() => props.projectId, loadGuidance)

const addVisible = ref(false)
const saving = ref(false)
const form = reactive({ weekNo: 1, content: '' })

function openAdd() {
  form.weekNo = nextWeek.value
  form.content = ''
  addVisible.value = true
}

async function submitRecord() {
  if (form.content.trim().length < 10) {
    ElMessage.warning('指导记录至少 10 个字')
    return
  }
  saving.value = true
  try {
    await createGuidance(props.projectId, {
      weekNo: form.weekNo,
      content: form.content.trim(),
    })
    ElMessage.success('指导记录已提交')
    addVisible.value = false
    loadGuidance()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

const replyVisible = ref(false)
const replying = ref(false)
const replyTarget = ref(null)
const replyText = ref('')

function openReply(record) {
  replyTarget.value = record
  replyText.value = record.feedback || ''
  replyVisible.value = true
}

async function submitReply() {
  if (replyText.value.trim().length < 5) {
    ElMessage.warning('反馈至少 5 个字')
    return
  }
  replying.value = true
  try {
    await feedbackGuidance(props.projectId, replyTarget.value.id, replyText.value.trim())
    ElMessage.success('反馈已提交')
    replyVisible.value = false
    loadGuidance()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    replying.value = false
  }
}

const aiLoading = ref(false)

async function generateFeedback() {
  if (!replyTarget.value) return
  aiLoading.value = true
  try {
    const result = await aiAssist({
      type: 'guidance_feedback',
      projectId: props.projectId,
      recordId: replyTarget.value.id,
    })
    replyText.value = result.content
    ElMessage.success(`已生成草稿（${result.provider} / ${result.model}）`)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <section v-loading="loading" class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <h2 class="section-title">指导记录</h2>
        <span class="panel-count num">{{ records.length }} RECORDS</span>
      </div>
      <el-button v-if="isStudent" type="primary" size="small" @click="openAdd">提交本周记录</el-button>
    </div>

    <div v-if="records.length" class="record-list">
      <article v-for="record in records" :key="record.id" class="record">
        <span class="week num">W{{ String(record.weekNo).padStart(2, '0') }}</span>

        <div class="record-body">
          <div class="record-head">
            <span class="record-author">{{ record.student.name }}</span>
            <span class="record-time num">{{ formatDateTime(record.createdAt) }}</span>
          </div>
          <p class="record-content">{{ record.content }}</p>

          <div v-if="record.feedback" class="feedback">
            <span class="feedback-label">导师反馈</span>
            <p class="feedback-text">{{ record.feedback }}</p>
            <span v-if="record.feedbackAt" class="feedback-time num">
              {{ formatDateTime(record.feedbackAt) }}
            </span>
          </div>

          <div v-if="canManage" class="record-actions">
            <el-button size="small" :type="record.feedback ? 'default' : 'primary'" @click="openReply(record)">
              {{ record.feedback ? '修改反馈' : '回复' }}
            </el-button>
          </div>
        </div>
      </article>
    </div>

    <EmptyState
      v-else-if="!loading"
      title="还没有指导记录"
      :description="isStudent ? '每周提交一次进展，导师的反馈会显示在这里。' : '学生提交后，这里会显示每周进展。'"
      :action-text="isStudent ? '提交第一条记录' : ''"
      @action="openAdd"
    />

    <el-dialog v-model="addVisible" title="提交指导记录" width="560px">
      <el-form label-position="top">
        <el-form-item label="周次">
          <el-input-number v-model="form.weekNo" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="本周进展">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="完成了什么、遇到什么问题、下周计划"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRecord">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="replyVisible" title="导师反馈" width="520px">
      <p class="reply-target num">W{{ String(replyTarget?.weekNo || 0).padStart(2, '0') }}</p>
      <el-input
        v-model="replyText"
        type="textarea"
        :rows="4"
        maxlength="400"
        show-word-limit
        placeholder="给出修改建议或下一步安排"
      />
      <template #footer>
        <el-button :loading="aiLoading" @click="generateFeedback">AI 生成反馈草稿</el-button>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="replying" @click="submitReply">提交反馈</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.panel-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.panel-count {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.record-list {
  padding: 4px 20px 16px;
}

.record {
  display: flex;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line-soft);
}

.record:last-child {
  border-bottom: none;
}

.week {
  width: 38px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 3px;
  font-size: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.record-body {
  flex: 1;
  min-width: 0;
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.record-author {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.record-time {
  font-size: 10px;
  color: var(--text-faint);
}

.record-content {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--text-regular);
}

.feedback {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--surface-soft);
  border-left: 2px solid var(--jade-300);
}

.feedback-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--jade-700);
}

.feedback-text {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-primary);
}

.feedback-time {
  display: block;
  margin-top: 6px;
  font-size: 9.5px;
  color: var(--text-faint);
}

.record-actions {
  margin-top: 8px;
}

.reply-target {
  margin: 0 0 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
