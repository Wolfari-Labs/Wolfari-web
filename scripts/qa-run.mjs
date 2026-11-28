import { resolve, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { allocate } from '../tests/qa/report-core.mjs';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const args = process.argv.slice(2);
const mode = args.shift() || 'smoke';
if (!['smoke', 'full'].includes(mode)) throw new Error('Use qa-run.mjs smoke|full [Playwright filters]');
if (args.some(a => /output|reporter|config|update-snapshot|shard/.test(a))) throw new Error('Report/output overrides and snapshot updates are not permitted');
const reportRoot = join(root, 'BaoCaoKiemThu');
const run = allocate(reportRoot);
const metadata = { ...run, root: reportRoot, mode, startedAt: new Date().toISOString(), startedVietnam: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  environment: process.env.WOLFARI_QA_ENV || 'UNCONFIGURED', webUrl: process.env.WOLFARI_QA_WEB_URL || null,
  backendCommit: process.env.WOLFARI_QA_BACKEND_COMMIT || 'UNKNOWN', priceSource: process.env.WOLFARI_QA_PRICE_SOURCE || 'UNKNOWN',
  node: process.version, platform: process.platform, args,
  provenance: 'REAL_BACKEND_ONLY; no Gateway mocks; no native client' };
const manifest = join(run.directory, 'metadata.json');
writeFileSync(manifest, JSON.stringify(metadata, null, 2));
console.log(`Báo cáo: ${run.directory}`);
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.srs.config.ts', ...(mode === 'smoke' ? ['--grep', '@smoke'] : []), ...args], { cwd: root, env: { ...process.env, WOLFARI_QA_RUN: manifest }, windowsHide: true, stdio: 'inherit' });
child.on('error', error => { writeFileSync(join(run.directory, 'launch-error.txt'), error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
