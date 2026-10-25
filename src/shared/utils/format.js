// ── 格式化工具函数 ──
// 职责：日期/金额等格式化统一封装，禁止在组件中内联格式化逻辑
// 规范依据：CLAUDE.md §6.1 — 日期/金额格式统一封装

/**
 * 格式化日期
 * @param {string|Date} date — 日期值
 * @param {Object} options
 * @param {'date'|'datetime'|'time'} options.format — 输出格式
 * @returns {string}
 */
export function formatDate(date, { format = 'date' } = {}) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'

  switch (format) {
  case 'datetime':
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  case 'time':
    return d.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  case 'date':
  default:
    // 使用本地时区拼接，避免 toISOString 在晚间日期上出现偏移一天
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
  }
}

/**
 * 格式化日期时间（快捷方式）
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return formatDate(date, { format: 'datetime' })
}
