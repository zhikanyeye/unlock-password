import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000
  },
  preview: {
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        // 启用代码分割
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['antd', '@ant-design/icons'],
          crypto: ['crypto-js', 'pako']
        }
      }
    },
    // 启用资源压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成 source map
    sourcemap: false,
    // 设置块大小警告限制
    chunkSizeWarningLimit: 1000
  }
})
