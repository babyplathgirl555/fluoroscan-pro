import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/process-image': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace('/api/process-image', '/process-image'),
      },
      '/api/analyze': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace('/api/analyze', '/analyze'),
      },
      '/api/results': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace('/api/results', '/results'),
      },
      '/api/generate-report': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace('/api/generate-report', '/generate-report'),
      },
      '/health': 'http://localhost:8000',
    }
  }
})