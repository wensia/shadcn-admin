import fs from 'fs'
import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const BUILD_ID = String(Date.now())

function versionFilePlugin(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ buildId: BUILD_ID }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    versionFilePlugin(),
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
