// ── 页面标题映射 ──
export const PAGE_TITLES = {
  Login: '登录',
  Topics: '课题中心',
  Projects: '项目',
  ProjectDetail: '项目详情',
  Applications: '申请',
  Dashboard: '数据看板',
  Notifications: '通知中心',
  AdminUsers: '用户管理',
  AdminLogs: '审计日志',
  MyBlindReviews: '盲审评阅',
  AdminBlindReviews: '盲审抽检',
  ExcellentHall: '优秀论文',
  AdminExcellent: '优秀论文评选',
  NotFound: '页面不存在',
  Error: '页面异常',
}

export function titleFor(name) {
  return PAGE_TITLES[name] || '工作台'
}
