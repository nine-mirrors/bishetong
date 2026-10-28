import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 组件按需引入，避免把整套组件与样式打进主包
    Components({ resolvers: [ElementPlusResolver({ importStyle: 'css' })] }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  preview: {
    port: 5181,
    // Playwright E2E 使用生产构建 + preview，避免开发服务器首次依赖优化造成抖动
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  server: {
    port: 5181,
    // 启动时预热全部业务页面，提前发现 Element Plus 按需样式依赖，
    // 避免演示过程中首次进入新页面时触发依赖重优化与整页刷新。
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/app/**/*.vue',
        './src/features/**/*.vue',
        './src/shared/**/*.vue',
      ],
    },
    // 前端 /api 请求代理到本地后端，避免跨域
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
})
