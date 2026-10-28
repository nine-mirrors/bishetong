import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js'],
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
    // Windows 沙箱下 forks worker 可能无法启动，线程池在本地与 CI 均可用
    pool: 'threads',
  },
})
