import { build } from 'vite';

// Shell/.env overrides cannot accidentally deploy preview/fixture runtime.
process.env.VITE_DATA_MODE = 'gateway';
process.env.VITE_PRICE_WATCH_PROVIDER = 'TRAVELPAYOUTS_CACHE';
await build({
  mode: 'production',
  build: { outDir: 'dist-deploy', emptyOutDir: true, sourcemap: false },
});
