import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  define: {},
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: loadEnv(mode, process.cwd(), '').VITE_GATEWAY_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      input:
        mode === 'preview'
          ? { app: 'index.html', designSystem: 'design-system.html' }
          : 'index.html',
    },
  },
  test: {
    include: ['tests/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    maxWorkers: 2,
  },
}));
