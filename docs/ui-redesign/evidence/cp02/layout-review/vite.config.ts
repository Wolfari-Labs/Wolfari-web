import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const repository = fileURLToPath(new URL('../../../../../', import.meta.url));
export default defineConfig({
  root, plugins: [react()], envDir: root,
  cacheDir: `${repository}.local/cp02-review-vite`,
  server: { host: '127.0.0.1', port: 5188, strictPort: true, fs: { allow: [repository] } },
  build: { outDir: `${repository}.local/cp02-review-build`, emptyOutDir: false,
    rolldownOptions: { input: { index: `${root}index.html`, screen: `${root}screen.html` } } },
});
