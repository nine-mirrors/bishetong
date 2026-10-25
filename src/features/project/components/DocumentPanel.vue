<script setup>
// ── 项目详情 · 文档面板（上传 / 解析 / 预览） ──
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/shared/utils/format.js'
import { fetchDocumentContent, downloadProjectDocument, parseProjectDocument } from '@/shared/api/project.js'

const props = defineProps({
  projectId: { type: String, required: true },
  documents: { type: Array, required: true },
  milestones: { type: Array, required: true },
  uploading: { type: Boolean, default: false },
})

const emit = defineEmits(['upload', 'refresh'])

const fileInput = ref(null)
const milestoneId = ref('')
const parsingId = ref('')
const contentVisible = ref(false)
const contentLoading = ref(false)
const content = ref(null)

const SUPPORTED = new Set(['PDF', 'DOCX', 'MD', 'TXT'])

function chooseFile() {
  fileInput.value?.click()
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  emit('upload', { file, milestoneId: milestoneId.value })
  if (fileInput.value) fileInput.value.value = ''
}

function fileExt(name) {
  const ext = (name || '').split('.').pop()
  return ext ? ext.toUpperCase() : 'FILE'
}

function canParse(document) {
  return SUPPORTED.has(fileExt(document.fileName))
}

function parseLabel(document) {
  if (document.parseStatus === 'PARSED') return `${document.wordCount || 0} 字`
  if (document.parseStatus === 'FAILED') return '解析失败'
  if (document.parseStatus === 'UNSUPPORTED') return '暂不支持解析'
  return '未解析'
}

async function handleParse(document) {
  parsingId.value = document.id
  try {
    const result = await parseProjectDocument(props.projectId, document.id)
    if (result.parseStatus === 'PARSED') {
      ElMessage.success(`解析完成，共 ${result.wordCount || 0} 字`)
      emit('refresh')
    } else {
      ElMessage.warning(result.parseStatus === 'UNSUPPORTED' ? '该格式暂不支持解析' : '解析失败，请检查文件')
    }
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    parsingId.value = ''
  }
}

async function openContent(document) {
  contentVisible.value = true
  contentLoading.value = true
  content.value = null
  try {
    content.value = await fetchDocumentContent(props.projectId, document.id)
  } catch (error) {
    ElMessage.error(error.message)
    contentVisible.value = false
  } finally {
    contentLoading.value = false
  }
}

const downloadingId = ref('')

async function handleDownload(document) {
  downloadingId.value = document.id
  try {
    await downloadProjectDocument(props.projectId, document.id, document.fileName)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    downloadingId.value = ''
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel-head doc-head">
      <div class="panel-title">
        <h2 class="section-title">文档</h2>
        <span class="panel-count num">{{ documents.length }} FILES</span>
      </div>
      <div class="doc-actions">
        <el-select v-model="milestoneId" placeholder="关联里程碑" clearable class="doc-select">
          <el-option
            v-for="milestone in milestones"
            :key="milestone.id"
            :label="milestone.name"
            :value="milestone.id"
          />
        </el-select>
        <el-button type="primary" :loading="uploading" @click="chooseFile">上传文档</el-button>
        <input
          ref="fileInput"
          type="file"
          class="hidden-file"
          accept=".pdf,.doc,.docx,.md,.txt,.zip,.xlsx,.pptx"
          @change="handleFileChange"
        />
      </div>
    </div>

    <p class="doc-tip">支持 pdf / docx / md / txt / zip / xlsx / pptx，单文件 ≤ 10MB，同名自动累加版本。</p>

    <div v-if="documents.length === 0" class="doc-empty">暂无文档</div>
    <ul v-else class="doc-list">
      <li v-for="document in documents" :key="document.id" class="doc-item">
        <span class="doc-ext">{{ fileExt(document.fileName) }}</span>
        <div class="doc-info">
          <button
            type="button"
            class="doc-name"
            :disabled="downloadingId === document.id"
            @click="handleDownload(document)"
          >
            {{ document.fileName }}
          </button>
          <span class="doc-meta num">
            v{{ document.version }} · {{ formatDateTime(document.createdAt) }} ·
            {{ parseLabel(document) }}
          </span>
        </div>
        <div class="doc-item-actions">
          <button
            v-if="canParse(document) && document.parseStatus !== 'PARSED'"
            type="button"
            class="doc-action"
            :disabled="parsingId === document.id"
            @click="handleParse(document)"
          >
            {{ parsingId === document.id ? '解析中' : '解析' }}
          </button>
          <button
            v-if="document.parseStatus === 'PARSED'"
            type="button"
            class="doc-action"
            @click="openContent(document)"
          >
            查看解析
          </button>
          <button
            type="button"
            class="doc-download"
            :disabled="downloadingId === document.id"
            @click="handleDownload(document)"
          >
            {{ downloadingId === document.id ? '下载中' : '下载 →' }}
          </button>
        </div>
      </li>
    </ul>

    <el-dialog
      v-model="contentVisible"
      :title="content ? `文档解析 · ${content.fileName}` : '文档解析'"
      width="760px"
    >
      <div v-loading="contentLoading" class="parse-body">
        <template v-if="content">
          <div class="parse-stats num">
            <span>{{ content.wordCount || 0 }} 字</span>
            <span>{{ content.parseStatus === 'PARSED' ? '解析完成' : content.parseStatus }}</span>
            <span>{{ formatDateTime(content.parsedAt) }}</span>
          </div>
          <pre class="parse-text">{{ content.text || '暂无解析内容' }}</pre>
        </template>
      </div>
    </el-dialog>
  </section>
</template>

<style scoped>
.doc-head {
  flex-wrap: wrap;
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

.doc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-select {
  width: 170px;
}

.hidden-file {
  display: none;
}

.doc-tip {
  margin: 12px 20px 0;
  font-size: 10.5px;
  color: var(--text-faint);
}

.doc-empty {
  padding: 36px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.doc-list {
  list-style: none;
  margin: 0;
  padding: 4px 20px 12px;
}

.doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
}

.doc-item:last-child {
  border-bottom: none;
}

.doc-ext {
  width: 42px;
  padding: 4px 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--jade-700);
  background: var(--jade-100);
  border-radius: 3px;
  flex-shrink: 0;
}

.doc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.doc-name {
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--text-primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.doc-name:hover,
.doc-name:disabled {
  color: var(--jade-600);
}

.doc-name:disabled {
  cursor: wait;
}

.doc-meta {
  font-size: 10px;
  color: var(--text-faint);
}

.doc-item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.doc-action {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
}

.doc-action:hover {
  color: var(--jade-600);
}

.doc-action:disabled {
  color: var(--text-faint);
  cursor: wait;
}

.parse-body {
  min-height: 120px;
}

.parse-stats {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--line-soft);
  background: var(--surface-soft);
  font-size: 10.5px;
  color: var(--text-secondary);
}

.parse-text {
  max-height: 420px;
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid var(--line-soft);
  background: var(--paper);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-primary);
}

.doc-download {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--jade-600);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.doc-download:disabled {
  color: var(--text-faint);
  cursor: wait;
}
</style>
