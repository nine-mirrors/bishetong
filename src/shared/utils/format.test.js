import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from './format.js'

describe('formatDate', () => {
  it('空值与非法日期返回占位符', () => {
    expect(formatDate('')).toBe('-')
    expect(formatDate(null)).toBe('-')
    expect(formatDate('not-a-date')).toBe('-')
  })

  it('按本地时区拼接日期，不因 UTC 偏移少一天', () => {
    const localLateNight = new Date(2026, 9, 28, 23, 30)
    expect(formatDate(localLateNight)).toBe('2026-10-28')
  })

  it('日期时间包含日期与时间部分', () => {
    const text = formatDateTime('2026-10-28T09:05:00')
    expect(text).toContain('2026')
    expect(text).toContain('09:05')
  })
})
