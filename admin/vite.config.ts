import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The admin SPA is served at the site root by the Go backend.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:2026',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
