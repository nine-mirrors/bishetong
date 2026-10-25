// ── 归档 HTML 生成 ──
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN')
}

const PHASE_LABELS = {
  TOPIC: '选题',
  PROPOSAL: '开题',
  MIDTERM: '中期',
  DEFENSE: '答辩',
  ARCHIVED: '已归档',
}

const SIGN_LABELS = { STUDENT: '学生', ADVISOR: '导师', ADMIN: '教务' }

export function buildArchiveHtml(project) {
  const signatures = project.signatures || []
  const milestoneRows = (project.milestones || [])
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${PHASE_LABELS[item.phase] || item.phase}</td>
        <td>${formatDate(item.dueDate)}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${formatDate(item.submittedAt)}</td>
        <td>${escapeHtml(item.reviewComment || '—')}</td>
      </tr>`,
    )
    .join('')

  const guidanceRows = (project.guidanceRecords || [])
    .map(
      (item) => `<tr>
        <td>第 ${item.weekNo} 周</td>
        <td>${escapeHtml(item.content)}</td>
        <td>${escapeHtml(item.feedback || '—')}</td>
        <td>${formatDate(item.createdAt)}</td>
      </tr>`,
    )
    .join('')

  const documentRows = (project.documents || [])
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.fileName)}</td>
        <td>v${item.version}</td>
        <td>${formatDate(item.createdAt)}</td>
      </tr>`,
    )
    .join('')

  const signatureBlocks = ['STUDENT', 'ADVISOR', 'ADMIN']
    .map((role) => {
      const signature = signatures.find((item) => item.role === role)
      return `<div class="sign">
        <div class="sign-role">${SIGN_LABELS[role]}</div>
        ${
  signature
    ? `<img src="${signature.imageData}" alt="${SIGN_LABELS[role]}签名" />
           <div class="sign-meta">${escapeHtml(signature.user?.name || '')} · ${formatDate(signature.signedAt)}</div>`
    : '<div class="sign-empty">未签署</div>'
}
      </div>`
    })
    .join('')

  const grade = project.grade
  const gradeHtml = grade
    ? `<table class="kv">
        <tr><th>查重率</th><td>${grade.plagiarismRate ?? '—'}%</td><th>答辩组</th><td>${escapeHtml(grade.defenseGroup || '—')}</td></tr>
        <tr><th>导师评分（30%）</th><td>${grade.advisorScore ?? '—'}</td><th>评阅评分（30%）</th><td>${grade.reviewerScore ?? '—'}</td></tr>
        <tr><th>答辩评分（40%）</th><td>${grade.defenseScore ?? '—'}</td><th>总评 / 等级</th><td>${grade.finalScore ?? '—'} / ${escapeHtml(grade.level || '—')}</td></tr>
        <tr><th>答辩地点</th><td>${escapeHtml(grade.defenseLocation || '—')}</td><th>答辩时间</th><td>${formatDate(grade.defenseAt)}</td></tr>
      </table>`
    : '<p class="empty">暂无成绩记录</p>'

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.title)} · 毕业设计归档</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #14211d; background: #f5f4ef; }
  .sheet { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e3e1d7; padding: 48px; }
  .eyebrow { font-family: Consolas, monospace; font-size: 10px; letter-spacing: .22em; color: #0e7a63; margin: 0 0 8px; }
  h1 { margin: 0; font-size: 26px; }
  .meta { margin-top: 10px; font-size: 12px; color: #6b7a73; }
  h2 { margin: 32px 0 12px; font-size: 14px; border-left: 3px solid #0e7a63; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e3e1d7; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #faf9f5; color: #6b7a73; font-weight: 600; }
  .kv th { width: 18%; }
  p.content { font-size: 12.5px; line-height: 1.9; white-space: pre-line; }
  .signs { display: flex; gap: 24px; margin-top: 12px; }
  .sign { flex: 1; border: 1px solid #e3e1d7; padding: 14px; text-align: center; }
  .sign-role { font-size: 11px; color: #6b7a73; margin-bottom: 8px; }
  .sign img { max-height: 70px; max-width: 100%; }
  .sign-empty { height: 70px; display: flex; align-items: center; justify-content: center; color: #b0aaa0; font-size: 11px; }
  .sign-meta { margin-top: 8px; font-size: 10px; color: #98a49e; }
  .empty { color: #98a49e; font-size: 12px; }
  footer { margin-top: 40px; padding-top: 14px; border-top: 1px dashed #e3e1d7; font-family: Consolas, monospace; font-size: 9px; letter-spacing: .16em; color: #98a49e; }
  @media print { body { padding: 0; background: #fff; } .sheet { border: none; padding: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <p class="eyebrow">THESIS OS / ARCHIVE</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="meta">学生：${escapeHtml(project.student?.name || '')}（${escapeHtml(project.student?.studentNo || '')}） · 导师：${escapeHtml(project.advisor?.name || '')} · 阶段：${PHASE_LABELS[project.currentPhase] || project.currentPhase}</p>

    <h2>任务书</h2>
    ${
  project.taskBook
    ? `<p class="content">${escapeHtml(project.taskBook.content)}</p>
       ${project.taskBook.requirements ? `<p class="content">${escapeHtml(project.taskBook.requirements)}</p>` : ''}`
    : '<p class="empty">暂无任务书</p>'
}

    <h2>里程碑</h2>
    <table>
      <thead><tr><th>名称</th><th>阶段</th><th>截止</th><th>状态</th><th>提交时间</th><th>批阅意见</th></tr></thead>
      <tbody>${milestoneRows || '<tr><td colspan="6" class="empty">暂无里程碑</td></tr>'}</tbody>
    </table>

    <h2>指导记录</h2>
    <table>
      <thead><tr><th>周次</th><th>学生记录</th><th>导师反馈</th><th>提交时间</th></tr></thead>
      <tbody>${guidanceRows || '<tr><td colspan="4" class="empty">暂无指导记录</td></tr>'}</tbody>
    </table>

    <h2>过程文档</h2>
    <table>
      <thead><tr><th>文件</th><th>版本</th><th>上传时间</th></tr></thead>
      <tbody>${documentRows || '<tr><td colspan="3" class="empty">暂无文档</td></tr>'}</tbody>
    </table>

    <h2>成绩与答辩</h2>
    ${gradeHtml}

    <h2>电子签章</h2>
    <div class="signs">${signatureBlocks}</div>

    <footer>归档时间：${formatDate(new Date())} · 本文件由毕设通自动生成</footer>
  </div>
</body>
</html>`
}
