import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { buildServiceWorkerSource } from './src/utils/serviceWorker'
import { appIdentities } from './src/data/appIdentity'

const workers = () => Object.values(appIdentities).map((identity) => ({
  path: identity.serviceWorkerPath,
  scope: identity.scope,
  source: buildServiceWorkerSource(identity.scope === '/' ? 'consumer' : 'admin', `${identity.version}-private-network-v3`, identity.scope),
}))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3000'
  return {
    plugins: [react(), {
      name: 'padicheck-private-service-workers',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const worker = workers().find((entry) => entry.path === request.url?.split('?')[0])
          if (!worker) return next()
          response.setHeader('Content-Type', 'application/javascript')
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('Service-Worker-Allowed', worker.scope)
          response.end(worker.source)
        })
      },
      generateBundle() {
        for (const worker of workers()) this.emitFile({ type: 'asset', fileName: worker.path.slice(1), source: worker.source })
      },
    }],
    server: {
      allowedHosts: ['jean-unprospering-numerically.ngrok-free.dev'],
      watch: { ignored: ['**/.tmp/**'] },
      proxy: Object.fromEntries(['/v1', '/health', '/ready'].map((path) => [path, { target, changeOrigin: true }])),
    },
  }
})
