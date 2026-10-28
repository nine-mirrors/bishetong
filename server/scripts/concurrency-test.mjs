// ── 并发与压力测试：名额竞态、一人一项目、只读接口压测 ──
// 用法：npm run test:concurrency（自动启动临时后端，结束后清理测试数据）
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const prisma = new PrismaClient()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(currentDir, '..')
const port = 3199
const base = `http://127.0.0.1:${port}/api`
const tag = Date.now()
const startedAt = new Date()
const createdUserIds = []
const createdTopicIds = []
const createdApplicationIds = []

let child

function logStep(message) {
  console.log(`[concurrency] ${message}`)
}

async function apiRequest(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: response.status, data }
}

async function waitForHealth() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${base}/health`)
      if (response.ok) return
    } catch {
      // 服务尚未启动
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('临时后端启动超时')
}

async function startServer() {
  child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))
  child.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`[concurrency] 临时后端退出：${code}`)
  })
  await waitForHealth()
}

async function createTestUser(label) {
  const user = await prisma.user.create({
    data: {
      name: `并发测试-${label}`,
      email: `concurrency-${tag}-${label}@demo.edu`,
      passwordHash: 'not-used-in-test',
      role: 'STUDENT',
      department: '测试学院',
      isActive: true,
    },
  })
  createdUserIds.push(user.id)
  return user
}

async function createTopic(advisorId, title) {
  const topic = await prisma.topic.create({
    data: {
      title,
      description: '并发测试临时课题，测试结束后自动清理。',
      capacity: 1,
      status: 'OPEN',
      advisorId,
    },
  })
  createdTopicIds.push(topic.id)
  return topic
}

async function createApplication(topicId, studentId) {
  const application = await prisma.topicApplication.create({
    data: {
      topicId,
      studentId,
      statement: '并发测试临时申请，测试结束后自动清理。',
      status: 'PENDING',
    },
  })
  createdApplicationIds.push(application.id)
  return application
}

function sortStatuses(results) {
  return results.map((item) => item.status).sort((a, b) => a - b)
}

async function cleanup() {
  try {
    const projectIds = (
      await prisma.project.findMany({
        where: { topicId: { in: createdTopicIds } },
        select: { id: true },
      })
    ).map((item) => item.id)

    if (projectIds.length) {
      await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } })
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } })
    }

    await prisma.topicApplication.deleteMany({ where: { id: { in: createdApplicationIds } } })
    await prisma.topic.deleteMany({ where: { id: { in: createdTopicIds } } })

    const targetIds = [...createdTopicIds, ...createdApplicationIds, ...projectIds]
    if (targetIds.length) {
      await prisma.activityLog.deleteMany({ where: { targetId: { in: targetIds } } })
    }
    if (createdUserIds.length) {
      await prisma.notification.deleteMany({
        where: { userId: { in: createdUserIds }, createdAt: { gte: startedAt } },
      })
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    }
    logStep(`测试数据已清理：用户 ${createdUserIds.length} / 课题 ${createdTopicIds.length} / 申请 ${createdApplicationIds.length}`)
  } catch (error) {
    console.error('[concurrency] 清理失败：', error.message)
  }
}

async function main() {
  await startServer()
  logStep(`临时后端已启动：${base}`)

  const advisorLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'advisor@demo.edu', password: '123456' },
  })
  assert.equal(advisorLogin.status, 200, '导师登录失败')
  const advisorToken = advisorLogin.data.token
  const advisor = await prisma.user.findUnique({ where: { email: 'advisor@demo.edu' } })

  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.edu', password: '123456' },
  })
  assert.equal(adminLogin.status, 200, '教务登录失败')
  const adminToken = adminLogin.data.token

  const studentA = await createTestUser('A')
  const studentB = await createTestUser('B')
  const studentC = await createTestUser('C')

  // 场景 1：同一课题最后 1 个名额，两个学生并发通过
  const topicA = await createTopic(advisor.id, `并发测试-名额-${tag}`)
  const appA1 = await createApplication(topicA.id, studentA.id)
  const appA2 = await createApplication(topicA.id, studentB.id)

  const scenarioA = await Promise.all([
    apiRequest(`/applications/${appA1.id}/review`, {
      method: 'PUT',
      token: advisorToken,
      body: { action: 'APPROVED' },
    }),
    apiRequest(`/applications/${appA2.id}/review`, {
      method: 'PUT',
      token: advisorToken,
      body: { action: 'APPROVED' },
    }),
  ])
  const statusesA = sortStatuses(scenarioA)
  assert.deepEqual(statusesA, [200, 409], `名额并发结果异常：${JSON.stringify(statusesA)}`)
  assert.equal(
    await prisma.project.count({ where: { topicId: topicA.id } }),
    1,
    '同一课题并发通过后产生了多个项目',
  )
  logStep('场景 1 通过：同一课题最后 1 个名额只立项 1 次')

  // 场景 2：同一学生的两个课题并发通过
  const topicB = await createTopic(advisor.id, `并发测试-一人一项目-A-${tag}`)
  const topicC = await createTopic(advisor.id, `并发测试-一人一项目-B-${tag}`)
  const appB = await createApplication(topicB.id, studentC.id)
  const appC = await createApplication(topicC.id, studentC.id)

  const scenarioB = await Promise.all([
    apiRequest(`/applications/${appB.id}/review`, {
      method: 'PUT',
      token: advisorToken,
      body: { action: 'APPROVED' },
    }),
    apiRequest(`/applications/${appC.id}/review`, {
      method: 'PUT',
      token: adminToken,
      body: { action: 'APPROVED' },
    }),
  ])
  const statusesB = sortStatuses(scenarioB)
  assert.deepEqual(statusesB, [200, 409], `一人一项目并发结果异常：${JSON.stringify(statusesB)}`)
  assert.equal(
    await prisma.project.count({
      where: { studentId: studentC.id, topicId: { in: [topicB.id, topicC.id] } },
    }),
    1,
    '同一学生并发通过后产生了多个项目',
  )
  logStep('场景 2 通过：同一学生并发通过只立项 1 次')

  // 场景 3：只读接口压力测试
  async function pressure(label, pathname, count, token) {
    const started = Date.now()
    const results = await Promise.all(
      Array.from({ length: count }, async () => {
        const begin = Date.now()
        const response = await apiRequest(pathname, { token })
        return { ...response, duration: Date.now() - begin }
      }),
    )
    const elapsed = Date.now() - started
    const sortedDurations = results
      .map((item) => item.duration)
      .sort((a, b) => a - b)
    const p95 = sortedDurations[Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1)]
    const failed = results.filter((item) => item.status !== 200)
    assert.equal(failed.length, 0, `${label} 出现非 200：${failed.map((item) => item.status).join(',')}`)
    assert.ok(p95 < 3000, `${label} P95 ${p95}ms 超过 3000ms`)
    logStep(`${label}：${count} 并发全部 200，总耗时 ${elapsed}ms，P95 ${p95}ms`)
  }

  await pressure('项目列表', '/projects?page=1&pageSize=10', 50, adminToken)
  await pressure('看板聚合', '/stats/overview', 20, adminToken)
  await pressure('通知未读列表', '/notifications?status=UNREAD&page=1&pageSize=10', 30, adminToken)

  logStep('全部并发与压力测试通过')
}

main()
  .catch((error) => {
    console.error('[concurrency] 失败：', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    await prisma.$disconnect()
    if (child) {
      child.kill('SIGTERM')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  })
