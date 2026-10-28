// ── 把 Playwright JSON 报告中的失败用例转成 GitHub Actions 注解 ──
// 仅在 CI 的 E2E 失败步骤中执行，日志不可见时也能在 Annotations 中看到原因。
import fs from 'node:fs'

const reportFile = 'test-results/results.json'

if (!fs.existsSync(reportFile)) {
  console.log('::warning::未找到 Playwright JSON 报告')
  process.exit(0)
}

let report
try {
  report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))
} catch (error) {
  console.log(`::warning::Playwright 报告解析失败：${error.message}`)
  process.exit(0)
}

const failures = []

function walkSuite(suite, trail) {
  const path = [...trail, suite.title].filter(Boolean)
  for (const spec of suite.specs || []) {
    if (spec.ok) continue
    for (const test of spec.tests || []) {
      for (const result of test.results || []) {
        if (result.status === 'failed' || result.status === 'timedOut') {
          failures.push({
            title: [...path, spec.title].join(' > '),
            message: result.error?.message || '未知错误',
          })
        }
      }
    }
  }
  for (const child of suite.suites || []) walkSuite(child, path)
}

for (const suite of report.suites || []) walkSuite(suite, [])

if (!failures.length) {
  console.log('::warning::E2E 失败但未解析到具体失败用例')
  process.exit(0)
}

for (const failure of failures) {
  const message = String(failure.message).replace(/\r?\n/g, ' | ').slice(0, 800)
  console.log(`::error file=e2e/app.spec.js,title=${failure.title}::${message}`)
}
