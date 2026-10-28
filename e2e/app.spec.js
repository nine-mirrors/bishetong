import { expect, test } from '@playwright/test'

async function login(page, email) {
  await page.goto('/login')
  await page.locator('.login-form input').nth(0).fill(email)
  await page.locator('.login-form input').nth(1).fill('123456')
  await page.locator('.login-form .submit').click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function firstProjectId(page) {
  const token = await page.evaluate(() => localStorage.getItem('bishe_token'))
  const response = await page.request.get('/api/projects?page=1&pageSize=10', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data.list.length).toBeGreaterThan(0)
  return data.list[0].id
}

test.describe('学生：复杂项目详情', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'student@demo.edu')
  })

  test('五个标签、指导记录、签章与文档下载可用', async ({ page }) => {
    const projectId = await firstProjectId(page)
    await page.goto(`/projects/${projectId}`)

    await expect(page.locator('button.tab')).toHaveCount(5)
    await expect(page.locator('body')).toContainText('里程碑')

    await page.getByRole('button', { name: '指导记录', exact: true }).click()
    await expect(page.locator('body')).toContainText('导师反馈')

    await page.getByRole('button', { name: '签章归档', exact: true }).click()
    await expect(page.locator('body')).toContainText('电子签章')

    await page.getByRole('button', { name: '过程管理', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /下载/ }).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('学生访问教务看板进入 403 页', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/error\?code=403/)
    await expect(page.locator('body')).toContainText('没有访问权限')
  })
})

test.describe('教务：管理页面数据', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@demo.edu')
  })

  test('看板、申请、项目、用户、日志均有数据', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('body')).toContainText('项目总数')

    for (const path of ['/applications', '/projects', '/admin/users', '/admin/logs']) {
      await page.goto(path)
      await expect(page.locator('table tbody tr').first()).toBeVisible()
      expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0)
    }
  })
})
