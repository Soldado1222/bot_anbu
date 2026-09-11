import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_API_URL?.replace('https', 'wss').replace('http', 'ws') || 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    minify: 'terser',
  },
})
