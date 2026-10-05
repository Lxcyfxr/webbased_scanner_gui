import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, proxy API + WebSocket to the FastAPI backend.
// In production, FastAPI serves everything from the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/jobs':      'http://localhost:8000',
      '/tools':     'http://localhost:8000',
      '/wordlists': 'http://localhost:8000',
      '/ws': {
        target:    'ws://localhost:8000',
        ws:        true,
        changeOrigin: true,
      },
    },
  },
})
