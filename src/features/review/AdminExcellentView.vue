<script setup>
// ── 优秀论文评选（教务） ──
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  awardExcellent,
  fetchExcellentCandidates,
  revokeAward,
} from '@/shared/api/excellent.js'
import { aiAssist } from '@/shared/api/ai.js'
import EmptyState from '@/shared/components/EmptyState.vue'

const loading = ref(false)
const rows = ref([])
const filter = ref('ELIGIBLE')

async function loadData() {
  loading.value = true
  try {
    rows.value = await fetchExcellentCandidates()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const visibleRows = () => {
  if (filter.value === 'AWARDED') return rows.value.filter((item) => item.award)
  if (filter.value === 'ELIGIBLE') return rows.value.filter((item) => item.eligible || item.award)
  return rows.value
}

const dialogVisible = ref(false)
const saving = ref(false)
const target = ref(null)
const form = reactive({ level: 'COLLEGE', remark: '' })

function openAward(row) {
  target.value = row
  form.level = row.award?.level || 'COLLEGE'
  form.remark = row.award?.remark || ''
  dialogVisible.value = true
}

const aiLoading = ref(false)

async function generateRemark() {
  if (!target.value) return
  aiLoading.value = true
  try {
    const result = await aiAssist({ type: 'award_remark', projectId: target.value.projectId })
    form.remark = result.content
    ElMessage.success(`已生成评语草稿（${result.provider} / ${result.model}）`)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    aiLoading.value = false
  }
}

async function submitAward() {
  saving.value = true
  try {
    await awardExcellent({
      projectId: target.value.projectId,
      level: form.level,
      remark: form.remark,
    })
    ElMessage.success('已评选为优秀论文')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}

async function handleRevoke(row) {
  try {
    await ElMessageBox.confirm(`确认撤销《${row.title}》的优秀论文称号？`, '撤销评选', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await revokeAward(row.projectId)
    ElMessage.success('已撤销')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">EXCELLENCE AWARD</p>
        <h1 class="page-title">优秀论文评选</h1>
        <p class="page-sub">总评 ≥85、查重 ≤30%、合规 ≥80 的项目具备评选资格，由教务授予校级 / 院级优秀论文。</p>
      </div>
      <div class="page-head-actions">
        <el-radio-group v-model="filter" size="small">
          <el-radio-button value="ELIGIBLE">符合条件</el-radio-button>
          <el-radio-button value="AWARDED">已评选</el-radio-button>
          <el-radio-button value="ALL">全部</el-radio-button>
        </el-radio-group>
      </div>
    </header>

    <section class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <h2 class="section-title">候选项目</h2>
          <span class="panel-count num">{{ visibleRows().length }} ITEMS</span>
        </div>
        <span class="panel-note">规则：总评 ≥85 · 查重 ≤30% · 合规 ≥80</span>
      </div>

      <div class="table-wrap">
        <el-table v-loading="loading" :data="visibleRows()" empty-text="暂无可评选项目">
          <template #empty>
            <EmptyState title="暂无可评选项目" description="成绩发布且满足条件后，项目会进入候选列表。" />
          </template>
          <el-table-column label="项目" min-width="230">
            <template #default="{ row }">
              <div class="project-title">{{ row.title }}</div>
              <div class="cell-sub">{{ row.student.name }} · {{ row.student.studentNo || '—' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="导师" width="110" prop="advisor.name" />
          <el-table-column label="总评" width="80">
            <template #default="{ row }"><span class="num score">{{ row.finalScore ?? '—' }}</span></template>
          </el-table-column>
          <el-table-column label="查重" width="80">
            <template #default="{ row }"><span class="num">{{ row.plagiarismRate ?? '—' }}%</span></template>
          </el-table-column>
          <el-table-column label="合规" width="80">
            <template #default="{ row }"><span class="num">{{ row.complianceScore }}</span></template>
          </el-table-column>
          <el-table-column label="资格" width="120">
            <template #default="{ row }">
              <el-tooltip v-if="!row.eligible && !row.award" :content="row.reasons.join('；')" placement="top">
                <el-tag type="danger" effect="plain" size="small">不符合</el-tag>
              </el-tooltip>
              <el-tag v-else type="success" effect="light" size="small">符合条件</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="获奖" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.award" type="warning" effect="light" size="small">
                {{ row.award.level === 'SCHOOL' ? '校级' : '院级' }}
              </el-tag>
              <span v-else class="cell-sub">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="right">
            <template #default="{ row }">
              <el-button v-if="row.award" link type="danger" size="small" @click="handleRevoke(row)">
                撤销
              </el-button>
              <el-button v-else link type="primary" size="small" :disabled="!row.eligible" @click="openAward(row)">
                评选
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="评选优秀论文" width="480px">
      <p class="dialog-title">{{ target?.title }}</p>
      <el-form label-position="top">
        <el-form-item label="获奖等级">
          <el-select v-model="form.level">
            <el-option label="院级" value="COLLEGE" />
            <el-option label="校级" value="SCHOOL" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="form-label-row">
              评语（可选）
              <el-button link type="primary" size="small" :loading="aiLoading" @click="generateRemark">
                AI 生成评语
              </el-button>
            </span>
          </template>
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            placeholder="例如：选题扎实，系统完整，具有较强工程实践价值"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAward">确认评选</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
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
  padding: 0 20px 8px;
}

.project-title {
  font-size: 13px;
  font-weight: 600;
}

.cell-sub {
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--text-faint);
}

.score {
  font-size: 15px;
  font-weight: 700;
  color: var(--jade-700);
}

.dialog-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
}

.form-label-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
</style>
