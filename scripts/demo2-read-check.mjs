import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { backendFile, webRoot } from './demo-paths.mjs';

// Inspect the seeded personal demo through its built Web. Recommendation previews
// create temporary proposals. They must leave the Trip's Plan version unchanged.
const { webUrl } = JSON.parse(await readFile(backendFile('.local/demo/public.json'), 'utf8'));
if (webUrl !== 'http://localhost:5273') throw Error('Expected personal localhost demo');
const seed = JSON.parse(await readFile(backendFile('.local/demo/seed.json'), 'utf8'));
const trip = '/trips/' + seed.resources.tripId;
const out = resolve(webRoot, '.local/demo-2/srs-read-check.json');
const startedAt = new Date().toISOString();
const checks = [];
const browser = await chromium.launch({ executablePath: chromium.executablePath() });
async function actor(role) {
  const context = await browser.newContext({ baseURL: webUrl });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(seed.accounts[role].email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(seed.accounts[role].password);
  const loggedIn = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const bearer = (await (await loggedIn).json()).data.access_token;
  if (!bearer) throw Error('No Web access token');
  const read = (suffix) => context.request.get('/api/v1' + suffix, {
    headers: { authorization: 'Bearer ' + bearer, 'x-client-type': 'web' },
  });
  return { page, read };
}
async function check(name, run) {
  try {
    const detail = await run();
    checks.push({ name, status: 'PASS', ...detail });
  } catch (error) {
    // Error diagnostics from browser APIs may contain URLs or headers.
    checks.push({ name, status: 'FAIL', error: error.name });
  }
  console.log(name, checks.at(-1).status);
}
try {
  const owner = await actor('owner');
  const outsider = await actor('outsider');
  const plan = async () => {
    const res = await owner.read(trip + '/plan');
    expect(res.status()).toBe(200);
    return (await res.json()).data;
  };
  await check('plan-read', async () => {
    const data = await plan();
    return { activities: data.activities.length, packing: data.packing_items.length, dress: data.dress_codes.length,
      capabilities: data.capabilities ?? {}, version: data.plan_version };
  });
  await check('owner-plan-pdf', async () => {
    await owner.page.goto(trip + '/settings?mode=settings&section=export');
    const response = owner.page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/plan.pdf'));
    await owner.page.getByRole('button', { name: 'Xem trước PDF', exact: true }).click();
    const file = await response;
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toMatch(/^application\/pdf/);
    const bytes = await file.body();
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(owner.page.locator('iframe[title="Xem trước plan chuyến đi"]')).toBeVisible();
    const download = owner.page.waitForEvent('download');
    await owner.page.getByRole('button', { name:'Tải PDF', exact:true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
    return { http: file.status(), bytes: bytes.length, signature: '%PDF-', download: true };
  });
  await check('outsider-plan-pdf-denied', async () => {
    const res = await outsider.read(trip+'/plan.pdf');
    expect([403, 404]).toContain(res.status());
    return { http: res.status() };
  });
  for (const [name, path] of [['preferences', '/me/notification-preferences'], ['reminders', trip+'/reminders']]) {
    await check(name, async () => {
      const response = await owner.read(path);
      expect(response.status()).toBe(200);
      const data = (await response.json()).data;
      expect(data).toBeDefined();
      return { http: 200, fieldNames: Object.keys(data).filter((key) => !/^\d+$/.test(key)), rows: Array.isArray(data) ? data.length : undefined };
    });
  }
  for (const [route,label] of [['packing', 'Gợi ý hành lý'], ['dress-code','Gợi ý trang phục']]) {
    await check('preview-'+route, async () => {
      const before = (await plan()).plan_version;
      await owner.page.goto(trip+'/'+route);
      await owner.page.getByRole('button', { name: label, exact:true }).click();
      const preview = owner.page.waitForResponse((r) => r.request().method()==='POST' && new URL(r.url()).pathname.endsWith('/recommendations'));
      await owner.page.getByRole('button', { name: 'Tạo gợi ý', exact:true }).click();
      const response = await preview;
      expect(response.ok()).toBe(true);
      const result = (await response.json()).data;
      expect(Array.isArray(result.items)).toBe(true);
      expect((await plan()).plan_version).toBe(before);
      return { http: response.status(), items: result.items.length, warnings: result.warnings, unchangedVersion: before };
    });
  }
} finally {
  await browser.close();
  await mkdir(resolve(webRoot,'.local/demo-2'), { recursive:true });
  await writeFile(out, JSON.stringify({ startedAt, finishedAt:new Date().toISOString(), checks },null,2));
}
if (!checks.length || checks.some((item)=>item.status==='FAIL')) process.exitCode=1;
