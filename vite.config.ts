import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3457, // React项目端口
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9876', // 后端API端口
        changeOrigin: true,
        ws: true, // 支持WebSocket
      },
      '/health': {
        target: 'http://127.0.0.1:9876',
        changeOrigin: true,
      },
    },
  },
})
