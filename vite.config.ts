import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.DEV_API_PROXY_TARGET?.trim() || 'http://localhost:8787'
  const apiProxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
      secure: true,
    },
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      host: true,
      proxy: apiProxy,
    },
  }
})
