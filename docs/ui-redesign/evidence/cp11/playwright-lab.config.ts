import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import built from './playwright-built.config';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const tag = process.env.CP11_RUN_TAG ?? 'lab';
export default defineConfig(built, {
  testDir: fileURLToPath(new URL('./lab-tests/', import.meta.url)),
  workers: 1,
  fullyParallel: false,
  outputDir: path.join(root, `.local/cp11-${tag}-lab`),
  reporter: [['line'], ['json', { outputFile: path.join(root, `.local/cp11-${tag}-lab.json`) }]],
  use: { ...built.use, reducedMotion: 'no-preference' },
});
