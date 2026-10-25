<script setup>
// ── 项目详情 · 里程碑列表 ──
import { MILESTONE_STATUS, PROJECT_PHASE } from '@/shared/types/dict.js'
import { formatDate, formatDateTime } from '@/shared/utils/format.js'

defineProps({
  milestones: { type: Array, required: true },
  isStudent: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'review'])

function tone(status) {
  return {
    PENDING: 'idle',
    SUBMITTED: 'wait',
    APPROVED: 'done',
    REJECTED: 'warn',
  }[status]
}

function canSubmit(milestone, isStudent) {
  return isStudent && ['PENDING', 'REJECTED'].includes(milestone.status)
}

function canReview(milestone, canManage) {
  return canManage && milestone.status === 'SUBMITTED'
}
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div class="panel-title">
        <h2 class="section-title">里程碑</h2>
        <span class="panel-count num">{{ milestones.length }} ITEMS</span>
      </div>
      <span class="panel-note">提交后由导师批阅</span>
    </div>

    <ul class="milestone-list">
      <li
        v-for="milestone in milestones"
        :key="milestone.id"
        class="milestone"
        :class="tone(milestone.status)"
      >
        <span class="milestone-rail" />
        <div class="milestone-body">
          <div class="milestone-head">
            <div>
              <span class="milestone-name">{{ milestone.name }}</span>
              <span class="milestone-phase">{{ PROJECT_PHASE[milestone.phase].label }}</span>
            </div>
            <el-tag :type="MILESTONE_STATUS[milestone.status].elType" effect="light" size="small">
              {{ MILESTONE_STATUS[milestone.status].label }}
            </el-tag>
          </div>

          <div class="milestone-meta">
            <span class="num">截止 {{ formatDate(milestone.dueDate) }}</span>
            <span v-if="milestone.submittedAt" class="num">
              提交 {{ formatDateTime(milestone.submittedAt) }}
            </span>
          </div>

          <p v-if="milestone.reviewComment" class="milestone-comment">
            导师意见：{{ milestone.reviewComment }}
          </p>

          <div
            v-if="canSubmit(milestone, isStudent) || canReview(milestone, canManage)"
            class="milestone-actions"
          >
            <el-button
              v-if="canSubmit(milestone, isStudent)"
              type="primary"
              size="small"
              @click="emit('submit', milestone)"
            >
              提交材料
            </el-button>
            <template v-if="canReview(milestone, canManage)">
              <el-button type="primary" size="small" @click="emit('review', milestone, 'APPROVED')">
                通过
              </el-button>
              <el-button type="danger" size="small" text @click="emit('review', milestone, 'REJECTED')">
                退回
              </el-button>
            </template>
          </div>
        </div>
      </li>
    </ul>
  </section>
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

.milestone-list {
  list-style: none;
  margin: 0;
  padding: 8px 20px 20px;
}

.milestone {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 16px 0 16px 4px;
  border-bottom: 1px solid var(--line-soft);
}

.milestone:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}

.milestone-rail {
  width: 2px;
  border-radius: 2px;
  background: var(--line);
  flex-shrink: 0;
}

.milestone.done .milestone-rail {
  background: var(--moss-600);
}

.milestone.wait .milestone-rail {
  background: var(--amber-600);
}

.milestone.warn .milestone-rail {
  background: var(--clay-600);
}

.milestone-body {
  flex: 1;
  min-width: 0;
}

.milestone-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.milestone-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.milestone-phase {
  margin-left: 8px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.milestone-meta {
  display: flex;
  gap: 18px;
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--text-secondary);
}

.milestone-comment {
  margin: 8px 0 0;
  padding: 8px 10px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text-regular);
  background: var(--surface-soft);
  border-left: 2px solid var(--jade-300);
}

.milestone-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
</style>
