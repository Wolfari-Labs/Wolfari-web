import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Always run through demo1-e2e.mjs: no personal demo accounts or trip data are used.
const manifest = JSON.parse(await readFile(process.env.WOLFARI_DEMO1_MANIFEST, 'utf8'));
const day = '2026-11-16';

async function verifiedOwner(page) {
  const email = `dnd-${randomUUID()}@wolfari.test`;
  const password = `DnD-${randomUUID()}-9!`;
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('Gateway DnD live');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  let verificationLink;
  await expect
    .poll(
      async () => {
        const inbox = await (
          await fetch(manifest.mailpitUrl + '/api/v1/messages?limit=500')
        ).json();
        const message = inbox.messages.find(
          (item) =>
            item.Subject.includes('Xác minh') &&
            item.To?.some((recipient) => recipient.Address === email),
        );
        if (!message) return false;
        const body = await (
          await fetch(manifest.mailpitUrl + '/api/v1/message/' + message.ID)
        ).json();
        verificationLink = body.Text.match(/https?:\/\/\S+/)?.[0];
        return !!verificationLink;
      },
      { timeout: 45000 },
    )
    .toBe(true);
  await page.goto(verificationLink);
  await page.getByRole('button', { name: 'Xác minh email', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function openTools(page) {
  const summary = page.locator('summary[aria-label="Tùy chọn lịch trình"]');
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
}

async function createActivity(page, title, times) {
  await openTools(page);
  await page.getByRole('button', { name: 'Tạo hoạt động thủ công', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Thêm hoạt động', exact: true });
  await editor.getByLabel('Tên hoạt động', { exact: true }).fill(title);
  if (times) {
    await editor.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill(day);
    await editor.getByLabel('Giờ bắt đầu').fill(times[0]);
    await editor.getByLabel('Giờ kết thúc').fill(times[1]);
  }
  await editor.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByText('Đã lưu thay đổi.', { exact: true })).toBeVisible();
}

async function readPlanAfterReload(page, tripId) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/v1/trips/${tripId}/plan` &&
      response.status() === 200,
  );
  await page.reload();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

function activity(plan, title) {
  const item = plan.activities.find((entry) => entry.title === title);
  expect(item, title).toBeTruthy();
  return item;
}

async function keyboardDrop(page, title, keys, { waitForOrderReceipt = true } = {}) {
  const handle = page.getByRole('button', { name: `Kéo hoạt động ${title}`, exact: true });
  await expect(handle).toBeEnabled();
  // Arrangements are serial PATCH(es) followed by a full-order PUT. Reloading
  // before that receipt arrives aborts the command and can leave a partial write.
  const orderReceipt = waitForOrderReceipt
    ? page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === 'PUT' &&
          /\/api\/v1\/trips\/[0-9a-f-]{36}\/activities\/order$/.test(url.pathname)
        );
      })
    : null;
  await handle.focus();
  await handle.press('Enter');
  for (const key of keys) await page.keyboard.press(key);
  await page.keyboard.press('Enter');
  if (orderReceipt) expect((await orderReceipt).status()).toBe(200);
  if (!waitForOrderReceipt) return;
  await expect(handle).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
  // Serial Gateway PATCH/PUT steps must finish before reload; teardown otherwise aborts the final request.
  await expect(page.getByText('Đã lưu thay đổi.', { exact: true })).toBeVisible();
}

test('Gateway DnD live: real receipts, suffix reset, persistent pool and unknown replay without Backend changes', async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await verifiedOwner(page);
  await page.goto('/trips/new');
  await page.getByLabel('Tên chuyến đi', { exact: true }).fill(`DnD ${manifest.runId}`);
  await page.getByLabel('Ngày đi', { exact: true }).fill(day);
  await page.getByLabel('Ngày về', { exact: true }).fill('2026-11-18');
  await page.getByLabel('Múi giờ', { exact: true }).selectOption('Asia/Ho_Chi_Minh');
  await page.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  await page.getByRole('link', { name: 'Mở chuyến đi' }).click();
  const tripId = new URL(page.url()).pathname.split('/')[2];
  expect(tripId).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto(`/trips/${tripId}/plan`);
  await createActivity(page, 'A prefix', ['08:00', '09:00']);
  await createActivity(page, 'B middle', ['10:00', '11:00']);
  await createActivity(page, 'C last', ['12:00', '13:00']);
  await createActivity(page, 'D pool');
  const initial = await readPlanAfterReload(page, tripId);
  const ids = initial.activities.map((item) => item.id).sort();

  // The GET receipt can precede React's render; capture the ready timeline, not its skeleton.
  await expect(
    page.getByRole('button', { name: 'Kéo hoạt động C last', exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('live-normal-before.png') });
  await keyboardDrop(page, 'C last', ['ArrowUp']);
  const arranged = await readPlanAfterReload(page, tripId);
  expect(
    arranged.activities
      .filter((item) => item.starts_at || item.scheduled_date)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.title),
  ).toEqual(['A prefix', 'C last', 'B middle']);
  expect(activity(arranged, 'A prefix').starts_at).toBe(activity(initial, 'A prefix').starts_at);
  for (const title of ['C last', 'B middle'])
    expect(activity(arranged, title)).toMatchObject({
      scheduled_date: day,
      starts_at: null,
      ends_at: null,
    });
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đã chọn · Chưa xếp lịch' })).toBeVisible();
  await keyboardDrop(page, 'D pool', ['ArrowRight', 'ArrowDown']);
  await expect(page.getByRole('heading', { name: 'Đã chọn · Chưa xếp lịch' })).toBeVisible();
  const afterPoolInsert = await readPlanAfterReload(page, tripId);
  expect(activity(afterPoolInsert, 'D pool').scheduled_date).toBe(day);
  // A full reload closes the side panel; reopen it before continuing the pool workflow.
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đã chọn · Chưa xếp lịch' })).toBeVisible();
  await keyboardDrop(page, 'B middle', ['ArrowLeft']);
  await expect(page.getByRole('heading', { name: 'Đã chọn · Chưa xếp lịch' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('live-pool-after.png') });
  const afterPoolReturn = await readPlanAfterReload(page, tripId);
  expect(activity(afterPoolReturn, 'B middle').scheduled_date).toBeNull();
  const beforeUnknown = afterPoolReturn;
  expect(activity(beforeUnknown, 'A prefix').starts_at).toBe(
    activity(initial, 'A prefix').starts_at,
  );

  // Let the real server commit, then lose ONLY the response. Replaying must hit its receipt.
  let dropped = false;
  const orderWrites = [];
  await page.route(`**/api/v1/trips/${tripId}/activities/order`, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    orderWrites.push({
      body: route.request().postDataJSON(),
      key: route.request().headers()['idempotency-key'],
    });
    if (dropped) return route.continue();
    dropped = true;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('connectionreset');
  });
  await keyboardDrop(page, 'C last', ['ArrowUp'], { waitForOrderReceipt: false });
  await expect(page.getByText(/Chưa xác định thay đổi đã được lưu hay chưa/)).toBeVisible();
  const committed = await readPlanAfterReload(page, tripId);
  await openTools(page);
  await page.getByRole('button', { name: 'Tải lại để đối chiếu', exact: true }).click();
  const retry = page.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ', exact: true });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(page.getByText('Đã lưu thay đổi.', { exact: true })).toBeVisible();
  expect(orderWrites).toHaveLength(2);
  expect(orderWrites[1]).toEqual(orderWrites[0]);
  const replayed = await readPlanAfterReload(page, tripId);
  expect(replayed.plan_version).toBe(committed.plan_version);
  expect(replayed.activities.map((item) => item.id).sort()).toEqual(ids);
  expect(replayed.activities).toEqual(committed.activities);
  await page.unroute(`**/api/v1/trips/${tripId}/activities/order`);
  const reloaded = await readPlanAfterReload(page, tripId);
  expect(reloaded.activities).toEqual(replayed.activities);
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
  await testInfo.attach('live-gateway-dnd-evidence', {
    body: JSON.stringify(
      {
        mode: 'isolated live Backend',
        runId: manifest.runId,
        runtime: process.env.WOLFARI_DEMO1_RUNTIME,
        initialVersion: initial.plan_version,
        committedVersion: committed.plan_version,
        replayedVersion: replayed.plan_version,
        activityCount: reloaded.activities.length,
        orderReplayIdentical: true,
        backendModified: false,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});
