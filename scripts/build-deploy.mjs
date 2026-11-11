import { build } from 'vite';

// Shell/.env overrides cannot accidentally deploy preview/fixture runtime.
process.env.VITE_DATA_MODE = 'gateway';
await build({
  mode: 'production',
  build: { outDir: 'dist-deploy', emptyOutDir: true, sourcemap: false },
});
