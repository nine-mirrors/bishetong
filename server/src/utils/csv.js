// ── CSV 生成（带 BOM，兼容 Excel 中文） ──
const BOM = '\uFEFF'
const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsv(value) {
  let text = value === null || value === undefined ? '' : String(value)
  // 防止 Excel / WPS 把 =、+、-、@ 开头的内容当作公式执行
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  return `${BOM}${lines.join('\r\n')}`
}
