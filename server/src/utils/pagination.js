// ── 分页参数解析 ──
export function getPagination(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

/**
 * 从属列表的可选分页：不传 page / pageSize 时保持原来的数组返回，
 * 传入后才分页并返回 { list, total, page, pageSize }，兼容旧前端调用。
 */
export function getOptionalPagination(query) {
  if (query.page === undefined && query.pageSize === undefined) return null
  return getPagination(query)
}
