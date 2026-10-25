<script setup>
// ── 项目详情 · 电子签章与归档 ──
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  archiveProject,
  downloadArchive,
  downloadTimestamp,
  fetchArchive,
  fetchGrade,
  fetchSignatures,
  signProject,
  verifyArchive,
} from '@/shared/api/project.js'
import { useAuthStore } from '@/stores/auth.js'
import { formatDateTime } from '@/shared/utils/format.js'
import SignaturePad from './SignaturePad.vue'

const props = defineProps({
  projectId: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
})

const auth = useAuthStore()

const loading = ref(false)
const signatures = ref([])
const archive = ref(null)
const grade = ref(null)

const slots = [
  { role: 'STUDENT', label: '学生签名' },
  { role: 'ADVISOR', label: '导师签名' },
  { role: 'ADMIN', label: '教务签章' },
]

async function loadData() {
  loading.value = true
  try {
    const [signatureList, archiveData, gradeData] = await Promise.all([
      fetchSignatures(props.projectId),
      fetchArchive(props.projectId),
      fetchGrade(props.projectId),
    ])
    signatures.value = signatureList
    archive.value = archiveData
    grade.value = gradeData
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => props.projectId, loadData)

function signatureOf(role) {
  return signatures.value.find((item) => item.role === role) || null
}

const gradePublished = computed(() => grade.value?.status === 'PUBLISHED')
const hasStudent = computed(() => Boolean(signatureOf('STUDENT')))
const hasAdvisor = computed(() => Boolean(signatureOf('ADVISOR')))
const canArchive = computed(() => gradePublished.value && hasStudent.value && hasAdvisor.value)

const mySignature = computed(() =>
  signatures.value.find((item) => item.userId === auth.user?.id) || null,
)
const canSign = computed(() => !archive.value && !mySignature.value)

// ── 签名 ──
const signVisible = ref(false)
const padRef = ref(null)
const currentImage = ref('')
const saving = ref(false)

function openSign() {
  currentImage.value = ''
  signVisible.value = true
  setTimeout(() => padRef.value?.reset(), 120)
}

async function submitSignature() {
  const image = padRef.value?.toDataURL() || currentImage.value
  if (!image) {
    ElMessage.warning('请先在签名区手写签名')
    return
  }
  saving.value = true
  try {
    await signProject(props.projectId, image)
    ElMessage.success('签名已保存')
    signVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

// ── 归档 ──
const archiving = ref(false)

async function handleArchive() {
  try {
    await ElMessageBox.confirm(
      '归档后将锁定成绩与签名，项目进入“已归档”状态，确认继续？',
      '归档项目',
      { type: 'warning' },
    )
  } catch {
    return
  }
  archiving.value = true
  try {
    await archiveProject(props.projectId)
    ElMessage.success('项目已归档')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    archiving.value = false
  }
}

async function handleDownload() {
  try {
    await downloadArchive(props.projectId, `归档-${props.projectId.slice(-6)}.html`)
    ElMessage.success('归档文件下载已开始')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function handleDownloadTimestamp() {
  try {
    await downloadTimestamp(props.projectId, `时间戳-${props.projectId.slice(-6)}.tsr`)
    ElMessage.success('时间戳凭证下载已开始')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// ── 完整性校验 ──
const checking = ref(false)
const checkResult = ref(null)

async function handleVerify() {
  checking.value = true
  try {
    checkResult.value = await verifyArchive(props.projectId)
    if (checkResult.value.valid === true) ElMessage.success('归档件完整性校验通过')
    else if (checkResult.value.valid === false) ElMessage.error('归档件内容与摘要不一致')
    else ElMessage.info(checkResult.value.message)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div v-loading="loading" class="archive-wrap">
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">电子签章</h2>
          <el-tag v-if="archive" type="success" effect="light" size="small">已归档</el-tag>
          <el-tag v-else type="info" effect="light" size="small">待归档</el-tag>
        </div>
        <div class="head-actions">
          <el-button v-if="canSign" type="primary" size="small" @click="openSign">手写签名</el-button>
          <el-button v-if="archive" type="primary" size="small" @click="handleDownload">下载归档文件</el-button>
        </div>
      </div>

      <div class="sign-grid">
        <article v-for="slot in slots" :key="slot.role" class="sign-card">
          <div class="sign-head">
            <span class="sign-role">{{ slot.label }}</span>
            <el-tag
              :type="signatureOf(slot.role) ? 'success' : 'info'"
              effect="plain"
              size="small"
            >
              {{ signatureOf(slot.role) ? '已签署' : '待签署' }}
            </el-tag>
          </div>

          <div class="sign-canvas">
            <img
              v-if="signatureOf(slot.role)"
              :src="signatureOf(slot.role).imageData"
              :alt="slot.label"
              class="sign-image"
            />
            <span v-else class="sign-empty">尚未签署</span>
          </div>

          <div class="sign-meta">
            <template v-if="signatureOf(slot.role)">
              <span>{{ signatureOf(slot.role).user?.name }}</span>
              <span class="num">{{ formatDateTime(signatureOf(slot.role).signedAt) }}</span>
            </template>
            <span v-else>完成手写签名后自动记录时间</span>
          </div>
        </article>
      </div>

      <div v-if="archive" class="archive-banner">
        <div>
          <span class="banner-title">项目已归档</span>
          <p class="banner-meta num">归档时间：{{ formatDateTime(archive.archivedAt) }}</p>
          <p v-if="archive.digest" class="banner-digest num" :title="archive.digest">
            SHA-256 {{ archive.digest.slice(0, 16) }}…
          </p>
          <p v-if="archive.hasTimestamp" class="banner-meta num">
            可信时间戳：{{ formatDateTime(archive.timestampedAt) }} ·
            {{ archive.tsaUrl || 'RFC 3161 TSA' }}
          </p>
          <p
            v-if="checkResult?.timestamp?.verifiable"
            class="banner-check"
            :class="{ ok: checkResult.timestamp.valid === true, bad: checkResult.timestamp.valid === false }"
          >
            {{
              checkResult.timestamp.valid === true
                ? '时间戳摘要校验通过，归档时间可追溯'
                : '时间戳校验失败：令牌与归档内容不一致'
            }}
          </p>
          <p
            v-if="checkResult"
            class="banner-check"
            :class="{ ok: checkResult.valid === true, bad: checkResult.valid === false }"
          >
            {{
              checkResult.valid === true
                ? '完整性校验通过，归档内容未被改动'
                : checkResult.valid === false
                  ? '校验失败：内容与归档摘要不一致'
                  : checkResult.message
            }}
          </p>
        </div>
        <div class="banner-actions">
          <el-button size="small" :loading="checking" @click="handleVerify">校验完整性</el-button>
          <el-button v-if="archive.hasTimestamp" size="small" @click="handleDownloadTimestamp">
            下载时间戳
          </el-button>
          <el-button size="small" @click="handleDownload">下载 HTML 归档件</el-button>
        </div>
      </div>

      <div v-else-if="isAdmin" class="archive-action">
        <div class="checklist">
          <span class="check" :class="{ done: gradePublished }">成绩已发布</span>
          <span class="check" :class="{ done: hasStudent }">学生已签名</span>
          <span class="check" :class="{ done: hasAdvisor }">导师已签名</span>
        </div>
        <el-button type="primary" :disabled="!canArchive" :loading="archiving" @click="handleArchive">
          归档并生成归档件
        </el-button>
      </div>

      <p v-else class="archive-tip">
        学生、导师与教务完成签名、成绩发布后，由教务执行归档。
      </p>
    </section>

    <el-dialog v-model="signVisible" title="手写签名" width="560px">
      <SignaturePad ref="padRef" @change="currentImage = $event" />
      <p class="sign-tip">签名将作为电子签章附件写入归档文件，请确认后再提交。</p>
      <template #footer>
        <el-button @click="signVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitSignature">确认签名</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.archive-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.sign-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding: 20px;
}

.sign-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  overflow: hidden;
}

.sign-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-soft);
}

.sign-role {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.sign-canvas {
  height: 110px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(rgba(11, 21, 18, 0.03) 1px, transparent 1px),
    var(--surface-soft);
  background-size: 100% 34px;
}

.sign-image {
  max-width: 90%;
  max-height: 84px;
}

.sign-empty {
  font-size: 11px;
  color: var(--text-faint);
}

.sign-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 10px;
  color: var(--text-faint);
}

.archive-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 20px 20px;
  padding: 14px 16px;
  border: 1px solid rgba(31, 122, 77, 0.25);
  background: var(--moss-100);
  border-radius: 5px;
}

.banner-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--moss-600);
}

.banner-meta {
  margin: 4px 0 0;
  font-size: 10px;
  color: var(--text-secondary);
}

.banner-digest {
  margin: 4px 0 0;
  font-size: 9.5px;
  color: var(--text-faint);
}

.banner-check {
  margin: 6px 0 0;
  font-size: 10.5px;
  color: var(--text-secondary);
}

.banner-check.ok {
  color: var(--moss-600);
}

.banner-check.bad {
  color: var(--danger-600, #c0392b);
}

.banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.archive-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 20px 20px;
  padding: 14px 16px;
  border: 1px dashed var(--line);
  border-radius: 5px;
  background: var(--surface-soft);
}

.checklist {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.check {
  position: relative;
  padding-left: 14px;
  font-size: 11px;
  color: var(--text-secondary);
}

.check::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface);
}

.check.done {
  color: var(--moss-600);
}

.check.done::before {
  border-color: var(--moss-600);
  background: var(--moss-600);
}

.archive-tip {
  margin: 0 20px 20px;
  font-size: 11px;
  color: var(--text-faint);
}

.sign-tip {
  margin: 10px 0 0;
  font-size: 10.5px;
  color: var(--text-faint);
}

@media (max-width: 900px) {
  .sign-grid {
    grid-template-columns: 1fr;
  }

  .archive-action,
  .archive-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
