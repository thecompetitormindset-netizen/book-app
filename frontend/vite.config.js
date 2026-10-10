import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The production backend (Render service "book-app-backend").
const RENDER_BACKEND = 'https://book-app-backend-pzq2.onrender.com'

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
    // On Vercel the site calls the Render backend directly (it allows
    // cross-origin requests), so it works whatever the Vercel project's root
    // directory or rewrites are, and a stale VITE_API_URL can't break it.
    // Elsewhere VITE_API_URL can point the frontend at a separate backend.
    '__API_URL__': JSON.stringify(process.env.VERCEL ? RENDER_BACKEND : (process.env.VITE_API_URL || '')),
  },
})
