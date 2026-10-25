/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Servida em /elocampo/ no jpsalviano.com.br, ao lado da API em
// /api/v1/elocampo/. No desenvolvimento, a API roda na porta 8080.
export default defineConfig({
  base: '/elocampo/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/elocampo': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
