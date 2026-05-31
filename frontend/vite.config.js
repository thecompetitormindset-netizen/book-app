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
    // VITE_API_URL env var lets Vercel frontend talk to Railway backend
    '__API_URL__': JSON.stringify(process.env.VITE_API_URL || ''),
  },
})
