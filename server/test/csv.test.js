// ── CSV 生成单元测试 ──
import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeCsv, toCsv } from '../src/utils/csv.js'

test('普通文本直接输出', () => {
  assert.equal(escapeCsv('毕业设计'), '毕业设计')
  assert.equal(escapeCsv(42), '42')
})

test('包含逗号、引号、换行时整体加引号并转义', () => {
  assert.equal(escapeCsv('张三,李四'), '"张三,李四"')
  assert.equal(escapeCsv('他说"通过"'), '"他说""通过"""')
  assert.equal(escapeCsv('第一行\n第二行'), '"第一行\n第二行"')
})

test('空值与 null 输出空字符串', () => {
  assert.equal(escapeCsv(null), '')
  assert.equal(escapeCsv(undefined), '')
  assert.equal(escapeCsv(''), '')
})

test('公式前缀被转义，避免 CSV 注入', () => {
  assert.equal(escapeCsv('=1+1'), "'=1+1")
  assert.equal(escapeCsv('@SUM(A1)'), "'@SUM(A1)")
  assert.equal(escapeCsv('-2'), "'-2")
  assert.equal(escapeCsv('+86'), "'+86")
})

test('生成的 CSV 带 BOM 且行间使用 CRLF', () => {
  const csv = toCsv(['姓名', '备注'], [['张三', 'a,b']])
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('\r\n'))
  assert.ok(csv.includes('"a,b"'))
  assert.equal(csv, '\uFEFF姓名,备注\r\n张三,"a,b"')
})
