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
        CORS_ORIGIN: 'http://127.0.0.1:5181,http://localhost:5181',
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 5181 --strictPort',
      url: 'http://127.0.0.1:5181',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
