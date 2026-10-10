import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to backend in dev mode
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/thumbnails': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  define: {
    // On Vercel, vercel.json forwards /api/* to the backend, so always use
    // same-origin requests there (a stale VITE_API_URL can't break the app).
    // Elsewhere VITE_API_URL can point the frontend at a separate backend.
    '__API_URL__': JSON.stringify(process.env.VERCEL ? '' : (process.env.VITE_API_URL || '')),
  },
})
