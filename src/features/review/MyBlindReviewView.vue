<script setup>
// ── 我的盲审评阅（导师） ──
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMyBlindReviews, submitBlindReview, downloadBlindReviewDocument } from '@/shared/api/blindReview.js'
import { formatDateTime } from '@/shared/utils/format.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const loading = ref(false)
const rows = ref([])

async function loadData() {
  loading.value = true
  try {
    rows.value = await fetchMyBlindReviews()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const downloadingKey = ref('')

async function downloadMaterial(review, document) {
  downloadingKey.value = `${review.id}-${document.id}`
  const ext = (document.fileName.match(/\.[^.]+$/) || [''])[0].toLowerCase()
  try {
    await downloadBlindReviewDocument(
      review.id,
      document.id,
      `${review.anonymousCode}-v${document.version}${ext}`,
    )
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    downloadingKey.value = ''
  }
}

const dialogVisible = ref(false)
const submitting = ref(false)
const target = ref(null)
const form = reactive({ score: null, comment: '' })

function openSubmit(row) {
  target.value = row
  form.score = row.score ?? null
  form.comment = row.comment || ''
  dialogVisible.value = true
}

async function submit() {
  if (form.score === null) {
    ElMessage.warning('请输入评分')
    return
  }
  if (form.comment.trim().length < 5) {
    ElMessage.warning('评阅意见至少 5 个字')
    return
  }
  submitting.value = true
  try {
    await submitBlindReview(target.value.id, {
      score: form.score,
      comment: form.comment.trim(),
    })
    ElMessage.success('盲审结果已提交')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">MY BLIND REVIEWS</p>
        <h1 class="page-title">盲审评阅</h1>
        <p class="page-sub">评分与意见仅教务可见，评阅过程不展示学生与导师信息。</p>
      </div>
      <div class="page-head-actions">
        <span class="head-meta num">{{ rows.length }} TASKS</span>
      </div>
    </header>

    <div v-loading="loading" class="review-list">
      <article v-for="item in rows" :key="item.id" class="review-card">
        <div class="review-head">
          <span class="code num">{{ item.anonymousCode }}</span>
          <el-tag :type="item.status === 'SUBMITTED' ? 'success' : 'warning'" effect="light" size="small">
            {{ item.status === 'SUBMITTED' ? '已提交' : '待评阅' }}
          </el-tag>
        </div>

        <h3 class="review-title">{{ item.project.title }}</h3>
        <p class="review-meta num">分配时间：{{ formatDateTime(item.assignedAt) }}</p>

        <div v-if="item.project.documents.length" class="doc-row">
          <span class="doc-label">材料</span>
          <button
            v-for="doc in item.project.documents.slice(0, 3)"
            :key="doc.id"
            type="button"
            class="doc-link"
            :disabled="downloadingKey === `${item.id}-${doc.id}`"
            @click="downloadMaterial(item, doc)"
          >
            {{ doc.fileName }}
          </button>
        </div>
        <p v-else class="review-meta">该项目暂未上传评阅材料</p>

        <div v-if="item.status === 'SUBMITTED'" class="result">
          <span class="result-score num">{{ item.score }}</span>
          <p class="result-comment">{{ item.comment }}</p>
        </div>

        <div class="review-foot">
          <span class="num">{{ item.submittedAt ? `提交于 ${formatDateTime(item.submittedAt)}` : '' }}</span>
          <el-button
            v-if="item.status !== 'SUBMITTED'"
            type="primary"
            size="small"
            @click="openSubmit(item)"
          >
            提交评阅
          </el-button>
          <el-button v-else size="small" @click="openSubmit(item)">修改评阅</el-button>
        </div>
      </article>

      <EmptyState
        v-if="!loading && rows.length === 0"
        title="暂无盲审任务"
        description="教务抽取后，任务会出现在这里。"
      />
    </div>

    <el-dialog v-model="dialogVisible" title="提交盲审结果" width="520px">
      <p class="dialog-code num">{{ target?.anonymousCode }} · {{ target?.project.title }}</p>
      <el-form label-position="top">
        <el-form-item label="评分（0—100）">
          <el-input-number v-model="form.score" :min="0" :max="100" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="评阅意见">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="从选题意义、工作量、规范性、创新性等方面给出意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.head-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

.review-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code {
  font-size: 11px;
  color: var(--jade-700);
  padding: 3px 8px;
  background: var(--jade-100);
  border-radius: 3px;
}

.review-title {
  margin: 12px 0 0;
  font-size: 15px;
  font-weight: 600;
}

.review-meta {
  margin: 6px 0 0;
  font-size: 10.5px;
  color: var(--text-faint);
}

.doc-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.doc-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--text-faint);
}

.doc-link {
  padding: 0;
  border: none;
  border-bottom: 1px dashed var(--jade-300);
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  color: var(--jade-600);
  text-decoration: none;
  cursor: pointer;
}

.doc-link:disabled {
  color: var(--text-faint);
  border-bottom-color: var(--line);
  cursor: wait;
}

.result {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--surface-soft);
  border-left: 2px solid var(--jade-300);
}

.result-score {
  font-size: 24px;
  font-weight: 700;
  color: var(--jade-700);
  line-height: 1;
}

.result-comment {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-regular);
}

.review-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 10px;
  color: var(--text-faint);
}

.dialog-code {
  margin: 0 0 14px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
