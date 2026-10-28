// ── HTTP 层接口测试：应用装配、鉴权拒绝、安全头与错误处理 ──
// 使用 mock 的 Prisma 客户端，不依赖真实数据库，可在 CI 中直接执行。
import test, { before, after, mock } from 'node:test'
import assert from 'node:assert/strict'

// env.js 要求这两个变量存在；测试不连库，给占位值即可
process.env.DATABASE_URL ||= 'mysql://test:test@localhost:3306/test'
process.env.JWT_SECRET ||= 'test-only-secret'

const USERS = new Map([
  ['u-student', { id: 'u-student', role: 'STUDENT', isActive: true }],
  ['u-admin', { id: 'u-admin', role: 'ADMIN', isActive: true }],
  ['u-disabled', { id: 'u-disabled', role: 'STUDENT', isActive: false }],
])

mock.module('../src/lib/prisma.js', {
  namedExports: {
    prisma: {
      user: {
        findUnique: async ({ where }) => USERS.get(where.id) || null,
      },
    },
  },
})

const { default: app } = await import('../src/app.js')
const { signToken } = await import('../src/utils/jwt.js')

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  // 关闭 keep-alive 连接，避免测试进程等待数秒才退出
  server.closeAllConnections?.()
  await new Promise((resolve) => server.close(resolve))
})

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const text = await response.text()
  let body = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { response, body }
}

function authHeader(userId, role) {
  return { Authorization: `Bearer ${signToken({ sub: userId, role })}` }
}

test('健康检查返回 200 并带安全响应头', async () => {
  const { response, body } = await call('/api/health')

  assert.equal(response.status, 200)
  assert.equal(body.status, 'ok')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.equal(response.headers.get('x-powered-by'), null)
})

test('未携带 Token 访问受保护接口返回 401', async () => {
  const { response, body } = await call('/api/projects')

  assert.equal(response.status, 401)
  assert.match(body.message, /请先登录/)
})

test('伪造 Token 返回 401', async () => {
  const { response } = await call('/api/projects', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  })

  assert.equal(response.status, 401)
})

test('Token 对应用户不存在时返回 401', async () => {
  const { response, body } = await call('/api/projects', {
    headers: authHeader('u-deleted', 'STUDENT'),
  })

  assert.equal(response.status, 401)
  assert.match(body.message, /账号不存在/)
})

test('账号被停用后旧 Token 立即失效并返回 403', async () => {
  const { response, body } = await call('/api/projects', {
    headers: authHeader('u-disabled', 'STUDENT'),
  })

  assert.equal(response.status, 403)
  assert.match(body.message, /账号已被停用/)
})

test('Token 内的旧角色不被信任，以数据库角色为准', async () => {
  // Token 声称 ADMIN，但库里是 STUDENT：必须拒绝
  const { response, body } = await call('/api/stats/overview', {
    headers: authHeader('u-student', 'ADMIN'),
  })

  assert.equal(response.status, 403)
  assert.match(body.message, /无权访问/)
})

test('学生访问教务专属接口返回 403', async () => {
  const { response } = await call('/api/users', {
    headers: authHeader('u-student', 'STUDENT'),
  })

  assert.equal(response.status, 403)
})

test('未知接口返回 404', async () => {
  const { response, body } = await call('/api/not-exists')

  assert.equal(response.status, 404)
  assert.match(body.message, /接口不存在/)
})

test('上传静态目录已移除，直接访问 /uploads 返回 404', async () => {
  const { response } = await call('/uploads/seed-thesis.md')

  assert.equal(response.status, 404)
})

test('非法 JSON 请求体返回 400', async () => {
  const { response, body } = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email":',
  })

  assert.equal(response.status, 400)
  assert.match(body.message, /不是合法的 JSON/)
})

test('超过 1MB 的请求体返回 413', async () => {
  const { response, body } = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(1024 * 1024 + 10) }),
  })

  assert.equal(response.status, 413)
  assert.match(body.message, /请求体过大/)
})

test('CORS 预检返回允许来源', async () => {
  const { response } = await call('/api/health', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
    },
  })

  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})
