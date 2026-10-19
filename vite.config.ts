import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3000'
  return {
    plugins: [react()],
    server: { proxy: Object.fromEntries(['/v1', '/health', '/ready'].map((path) => [path, { target, changeOrigin: true }])) },
  }
})
