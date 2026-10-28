import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5181',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'node src/index.js',
      cwd: './server',
      url: 'http://127.0.0.1:3100/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        PORT: '3100',
        CORS_ORIGIN: 'http://127.0.0.1:5181,http://localhost:5181',
      },
    },
    {
      // CI 中构建已由独立步骤完成，这里只启动 preview，避免慢构建吃掉启动超时
      command: process.env.CI
        ? 'npm run preview -- --port 5181 --strictPort --host 127.0.0.1'
        : 'npm run build && npm run preview -- --port 5181 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:5181',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
