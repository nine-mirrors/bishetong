// ── 角色字典 ──
export const ROLE = {
  STUDENT: { label: '学生', elType: 'primary' },
  ADVISOR: { label: '导师', elType: 'success' },
  ADMIN: { label: '教务', elType: 'warning' },
}

// ── 课题状态字典 ──
export const TOPIC_STATUS = {
  OPEN: { label: '可申请', elType: 'success' },
  CLOSED: { label: '已关闭', elType: 'info' },
}

export const TOPIC_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '可申请', value: 'OPEN' },
  { label: '已关闭', value: 'CLOSED' },
]

// ── 申请状态字典 ──
export const APPLICATION_STATUS = {
  PENDING: { label: '待审核', elType: 'warning' },
  APPROVED: { label: '已通过', elType: 'success' },
  REJECTED: { label: '已驳回', elType: 'danger' },
}

export const APPLICATION_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
]

// ── 项目阶段字典 ──
export const PROJECT_PHASE = {
  TOPIC: { label: '选题', elType: 'info' },
  PROPOSAL: { label: '开题', elType: 'primary' },
  MIDTERM: { label: '中期', elType: 'warning' },
  DEFENSE: { label: '答辩', elType: 'danger' },
  ARCHIVED: { label: '已归档', elType: 'success' },
}

// ── 里程碑状态字典 ──
export const MILESTONE_STATUS = {
  PENDING: { label: '待提交', elType: 'info' },
  SUBMITTED: { label: '待批阅', elType: 'warning' },
  APPROVED: { label: '已通过', elType: 'success' },
  REJECTED: { label: '已退回', elType: 'danger' },
}

// ── 风险等级字典 ──
export const RISK_LEVEL = {
  HIGH: { label: '高风险', color: '#e11d48', elType: 'danger' },
  MEDIUM: { label: '中风险', color: '#d97706', elType: 'warning' },
  LOW: { label: '低风险', color: '#65a30d', elType: 'success' },
}

// ── 项目阶段选项与推进顺序 ──
export const PROJECT_PHASE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '选题', value: 'TOPIC' },
  { label: '开题', value: 'PROPOSAL' },
  { label: '中期', value: 'MIDTERM' },
  { label: '答辩', value: 'DEFENSE' },
  { label: '已归档', value: 'ARCHIVED' },
]

export const PHASE_STEPS = ['TOPIC', 'PROPOSAL', 'MIDTERM', 'DEFENSE', 'ARCHIVED']

export const PHASE_NEXT = {
  TOPIC: 'PROPOSAL',
  PROPOSAL: 'MIDTERM',
  MIDTERM: 'DEFENSE',
  DEFENSE: 'ARCHIVED',
  ARCHIVED: null,
}

// ── 项目状态字典 ──
export const PROJECT_STATUS = {
  ACTIVE: { label: '进行中', elType: 'primary' },
  COMPLETED: { label: '已完成', elType: 'success' },
}

// ── 用户角色 ──
export const USER_ROLE_OPTIONS = [
  { label: '学生', value: 'STUDENT' },
  { label: '导师', value: 'ADVISOR' },
  { label: '教务', value: 'ADMIN' },
]

export const USER_STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'DISABLED' },
]

// ── 审计动作字典 ──
export const ACTION_LABELS = {
  APPLY_TOPIC: '提交课题申请',
  APPROVE_APPLICATION: '通过课题申请',
  REJECT_APPLICATION: '驳回课题申请',
  SUBMIT_MILESTONE: '提交里程碑',
  REVIEW_MILESTONE: '批阅里程碑',
  CREATE_USER: '创建用户',
  ENABLE_USER: '启用用户',
  DISABLE_USER: '停用用户',
  RESET_PASSWORD: '重置密码',
  REMIND_PROJECT: '批量催办',
  ISSUE_TASKBOOK: '下达任务书',
  CONFIRM_TASKBOOK: '确认任务书',
  SUBMIT_GUIDANCE: '提交指导记录',
  REVIEW_GUIDANCE: '回复指导记录',
  SAVE_GRADE: '录入成绩',
  PUBLISH_GRADE: '发布成绩',
  SIGN_PROJECT: '电子签名',
  ARCHIVE_PROJECT: '项目归档',
}

export const ACTION_OPTIONS = [
  { label: '全部动作', value: '' },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
]

export const TARGET_TYPE_LABELS = {
  TOPIC: '课题',
  APPLICATION: '申请',
  PROJECT: '项目',
  MILESTONE: '里程碑',
  USER: '用户',
  GUIDANCE: '指导记录',
}
