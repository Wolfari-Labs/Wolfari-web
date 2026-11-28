import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { backendFile, backendRoot, webRoot } from './demo-paths.mjs';

// A fresh owner and outsider keep test trips away from the presentation account.
const { publicConfig } = await import(backendFile('scripts/demo-config.mjs'));
const { api, mailLink } = await import(backendFile('scripts/demo-scenarios.mjs'));
if (publicConfig.webUrl !== 'http://localhost:5273' ||
    publicConfig.gatewayUrl !== 'http://127.0.0.1:13000' ||
    publicConfig.mailpitUrl !== 'http://127.0.0.1:18025') {
  throw new Error('Local demo endpoints required');
}
const env = {
  ...process.env,
  WOLFARI_QA_ENV: 'TEST',
  WOLFARI_QA_WEB_URL: publicConfig.webUrl,
  WOLFARI_QA_ALLOW_ORIGIN: publicConfig.webUrl,
  WOLFARI_QA_TEST_DATA_ONLY: 'yes',
  WOLFARI_QA_BACKEND_COMMIT: execFileSync('git', ['rev-parse','HEAD'], { cwd:backendRoot, encoding:'utf8' }).trim(),
  PLAYWRIGHT_NO_COPY_PROMPT: '1',
};
for (const role of ['OWNER', 'OUTSIDER']) {
  const email = `qa-${role.toLowerCase()}-${randomUUID()}@wolfari.test`;
  const password = 'Qa-' + randomBytes(22).toString('base64url') + '-9!';
  await api('/api/v1/auth/register', 'POST', { email, password, full_name:'QA '+role }, undefined, undefined, [202]);
  const link = new URL(await mailLink(email, 'Xác minh'));
  await api('/api/v1/auth/email-verifications/confirm', 'POST', { token:link.searchParams.get('token') });
  env[`WOLFARI_QA_${role}_EMAIL`] = email;
  env[`WOLFARI_QA_${role}_PASSWORD`] = password;
}
const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [
  'scripts/qa-run.mjs', 'full', ...(args.length ? args : ['--project=chromium-desktop']), '--trace=off',
], { cwd:webRoot, env, windowsHide:true, stdio:'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
