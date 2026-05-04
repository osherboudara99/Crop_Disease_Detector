import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',   // forward to FastAPI
        changeOrigin: true,                // rewrite the Host header
        rewrite: (path) => path.replace(/^\/api/, ''),  // /api/predict → /predict
      },
    },
  },
})