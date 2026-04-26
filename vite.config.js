import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/metals': {
        target: 'https://metals.live',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/metals/, '/api/v1/latest'),
      },
      '/api/exchange': {
        target: 'https://open.er-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exchange/, '/v6/latest/USD'),
      },
    },
  },
})
