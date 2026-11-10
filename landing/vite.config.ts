import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
  // The 3D scene (three + r3f) is loaded with a dynamic import, so it already
  // lives in its own chunk and stays off the critical path.
  build: { chunkSizeWarningLimit: 1200 },
})
