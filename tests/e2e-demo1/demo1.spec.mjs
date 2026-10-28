import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const manifest = JSON.parse(await readFile(process.env.WOLFARI_DEMO1_MANIFEST, 'utf8'));
const runtime = process.env.WOLFARI_DEMO1_RUNTIME;
async function mail(email, subject, excludedLink) {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    const result = await (await fetch(manifest.mailpitUrl + '/api/v1/messages?limit=500')).json();
    const item = result.messages.find(m => m.Subject.includes(subject) && m.To?.some(t => t.Address === email));
    if (item) {
      const body = await (await fetch(manifest.mailpitUrl + '/api/v1/message/' + item.ID)).json();
      const link = body.Text.match(/https?:\/\/\S+/)?.[0];
      if (link && link !== excludedLink) return link;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw Error('MAIL_DELIVERY_TIMEOUT');
}
async function login(page, account, returnTo = '/profile') {
  await page.goto('/login?returnTo=' + encodeURIComponent(returnTo));
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(returnTo + '$'));
}
async function register(page, label, email = `d1-${randomUUID()}@wolfari.test`) {
  const account = { name: label, email, password: `D1-${randomUUID()}-9!` };
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill(label);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password);
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(account.password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  let link = await mail(account.email, 'Xác minh');
  if (label === 'Outsider X') {
    await login(page, account);
    await page.getByRole('button', { name: 'Gửi lại email xác minh', exact: true }).click();
    await expect(page.getByText(/Yêu cầu gửi email xác minh đã được tiếp nhận/)).toBeVisible();
    link = await mail(account.email, 'Xác minh', link);
  }
  await page.goto(link);
  await page.getByRole('button', { name: 'Xác minh email', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, account);
  return account;
}
async function fund(page, tripId) {
  await page.goto(`/trips/${tripId}/fund`);
  await expect(page.getByRole('heading', { name: 'Quỹ nhóm', exact: true })).toBeVisible();
}
async function confirmForm(page, label) {
  const dialog = page.getByRole('dialog', { name: label, exact: true });
  await dialog.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.', { exact: true })).toBeVisible();
}
async function linkInvite(owner, tripId) {
  await owner.goto(`/trips/${tripId}/members`);
  await owner.getByRole('button', { name: 'Lời mời', exact: true }).click();
  await owner.getByLabel('Loại lời mời').selectOption('LINK');
  await owner.getByRole('button', { name: 'Tạo liên kết', exact: true }).click();
  const region = owner.getByRole('region', { name: 'Liên kết một lần' });
  await expect(region).toBeVisible();
  const link = await region.locator('p').innerText();
  await owner.getByRole('button', { name: 'Đóng liên kết', exact: true }).click();
  return link;
}
async function accept(page, link, tripId) {
  await page.goto(link);
  await page.getByRole('button', { name: 'Chấp nhận', exact: true }).click();
  await expect(page).toHaveURL(`/trips/${tripId}`);
}
async function setEditors(owner, tripId, names) {
  await owner.goto(`/trips/${tripId}/members`);
  await owner.getByRole('button', { name: 'Quyền sửa lịch trình', exact: true }).click();
  await owner.getByLabel('Ai có thể sửa lịch trình').selectOption(names.length ? 'SELECTED_MEMBERS' : 'OWNER_ONLY');
  for (const name of names) await owner.getByRole('checkbox', { name, exact: true }).check();
  await owner.getByRole('button', { name: 'Lưu quyền', exact: true }).click();
  await expect(owner.getByText('Đã xác nhận quyền và danh sách Editor từ server.')).toBeVisible();
}
async function control(action, target) {
  const r = await fetch(manifest.controlUrl + '/' + action + '/' + target, { method: 'POST', headers: { authorization: 'Bearer ' + process.env.WOLFARI_DEMO1_CONTROL_TOKEN } });
  expect(r.status, 'isolated harness control').toBe(200);
}

test('REAL demo1: five accounts, shared Plan, manual 500000 ledger, recovery, departure and restart', async ({ browser }) => {
  test.setTimeout(720000);
  const contexts = [], pages = {}, accounts = {}, diagnostics = [];
  let tripId;
  try {
    await test.step('five new accounts verified by real Mailpit, no business SQL seed', async () => {
      for (const [role, name] of [['owner','Owner A'], ['holder','Holder B'], ['editor','Editor C'], ['member','Member D'], ['outsider','Outsider X']]) {
        const context = await browser.newContext({ baseURL: manifest.webUrl }); contexts.push(context);
        const page = await context.newPage(); pages[role] = page;
        page.on('pageerror', error => diagnostics.push({ role, pageError: error.message.replace(/https?:\/\/\S+/g, '[URL]') }));
        page.on('requestfailed', request => {
          diagnostics.push({ role, failedPath: new URL(request.url()).pathname, failure: request.failure()?.errorText });
        });
        page.on('console', message => {
          if (message.type() === 'error') diagnostics.push({ role, consoleError: message.text().replace(/https?:\/\/\S+/g, '[URL]').slice(0, 350) });
        });
        page.on('response', async response => {
          const path = new URL(response.url()).pathname;
          if (response.status() >= 400 && !path.startsWith('/api/')) diagnostics.push({ role, assetPath: path, status: response.status() });
          if (!/\/api\/v1\/trips\/[0-9a-f-]{36}(?:\/plan|\/plan-policy)?$/.test(path)) return;
          try {
            const body = await response.json();
            diagnostics.push({ role, path, status: response.status(), error: body.error?.code,
              planVersion: body.data?.plan_version, exportRevision: body.data?.export_revision, permissions: body.data?.permissions,
              activityCount: body.data?.activities?.length });
          } catch { /* Non-JSON error already visible by HTTP status. */ }
        });
        accounts[role] = await register(page, name);
      }
    });
    const { owner, holder, editor, member, outsider } = pages;
    await test.step('profile/avatar, MinIO loss/recovery, revoke another session, change/reset password through UI', async () => {
      await outsider.getByLabel('Tên hiển thị').fill('Outsider X updated');
      await outsider.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
      await expect(outsider.getByText('Đã lưu thông tin cá nhân.')).toBeVisible();
      await outsider.getByLabel('Chọn ảnh đại diện').setInputFiles({ name: 'demo-avatar.png', mimeType: 'image/png', buffer: await readFile(resolve('src/shared/assets/figma/ddfc7.png')) });
      await expect(outsider.getByText('Đã cập nhật ảnh đại diện.')).toBeVisible();
      await outsider.reload();
      await expect(outsider.getByLabel('Tên hiển thị')).toHaveValue('Outsider X updated');
      await expect(outsider.locator('img[alt="Outsider X updated"]')).toHaveAttribute('src', /^blob:/);
      await control('stop', 'minio');
      try {
        await outsider.reload();
        await expect(outsider.getByText(/Chưa tải được ảnh đại diện/)).toBeVisible();
        await expect(outsider.getByLabel('Tên hiển thị')).toHaveValue('Outsider X updated');
      } finally { await control('start', 'minio'); }
      await outsider.reload();
      await expect(outsider.locator('img[alt="Outsider X updated"]')).toHaveAttribute('src', /^blob:/);
      const otherContext = await browser.newContext({ baseURL: manifest.webUrl }); contexts.push(otherContext);
      const other = await otherContext.newPage();
      const loginResponse = other.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
      await login(other, accounts.outsider);
      const otherSessionId = (await (await loginResponse).json()).data.session_id;
      await outsider.getByText('Phiên đăng nhập', { exact: true }).click();
      await outsider.locator(`[data-session-id="${otherSessionId}"]`).getByRole('button', { name: 'Thu hồi phiên' }).click();
      await expect(outsider.getByText('Đã thu hồi phiên.', { exact: true })).toBeVisible();
      await other.reload(); await expect(other).toHaveURL(/\/login\?/);
      await otherContext.close();
      const nextPassword = `D1-${randomUUID()}-9!`;
      await outsider.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(accounts.outsider.password);
      await outsider.getByLabel('Mật khẩu mới', { exact: true }).fill(nextPassword);
      await outsider.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill(nextPassword);
      await outsider.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
      await expect(outsider).toHaveURL(/\/login$/);
      accounts.outsider.password = nextPassword; await login(outsider, accounts.outsider);
      await outsider.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      await outsider.getByRole('link', { name: /Quên mật khẩu/ }).click();
      await outsider.getByLabel('Email', { exact: true }).fill(accounts.outsider.email);
      await outsider.getByRole('button', { name: 'Gửi hướng dẫn', exact: true }).click();
      await expect(outsider.getByText(/Nếu email tồn tại/)).toBeVisible();
      await outsider.goto(await mail(accounts.outsider.email, 'mật khẩu'));
      const resetPassword = `D1-${randomUUID()}-9!`;
      await outsider.getByLabel('Mật khẩu mới', { exact: true }).fill(resetPassword);
      await outsider.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(resetPassword);
      await outsider.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
      await expect(outsider).toHaveURL(/\/login$/);
      accounts.outsider.password = resetPassword; await login(outsider, accounts.outsider);
    });
    await test.step('create Trip through real UI and accept EMAIL/LINK invitations', async () => {
      await owner.goto('/trips/new');
      await owner.getByLabel('Tên chuyến đi', { exact: true }).fill(`Demo1 ${runtime} ${manifest.runId}`);
      await owner.getByLabel('Ngày đi', { exact: true }).fill('2026-11-02');
      await owner.getByLabel('Ngày về', { exact: true }).fill('2026-11-05');
      await owner.getByLabel('Múi giờ IANA', { exact: true }).fill('Asia/Ho_Chi_Minh');
      await owner.getByLabel('Mô tả ngắn', { exact: true }).fill('Demo local — dữ liệu thật, chuyển tiền TEST.');
      let createDropped = false;
      const createWrites = [];
      await owner.route('**/api/v1/trips', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        createWrites.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() });
        if (createDropped) return route.continue();
        createDropped = true;
        const result = await route.fetch(); expect(result.status()).toBe(201);
        await route.abort('connectionreset');
      });
      await owner.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
      await expect(owner.getByText(/Chưa xác nhận được kết quả. Yêu cầu đã được giữ nguyên/)).toBeVisible();
      await owner.reload();
      await expect(owner.getByLabel('Tên chuyến đi', { exact: true })).toBeDisabled();
      await owner.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ', exact: true }).click();
      await expect(owner.getByRole('link', { name: 'Mở chuyến đi' })).toBeVisible();
      expect(createWrites).toHaveLength(2); expect(createWrites[1]).toEqual(createWrites[0]);
      await owner.unroute('**/api/v1/trips');
      await owner.getByRole('link', { name: 'Mở chuyến đi' }).click();
      tripId = new URL(owner.url()).pathname.split('/')[2];
      expect(tripId).toMatch(/^[0-9a-f-]{36}$/);
      await owner.goto(`/trips/${tripId}/members`);
      await owner.getByRole('button', { name: 'Lời mời', exact: true }).click();
      await owner.getByLabel('Email người nhận').fill(accounts.holder.email);
      await owner.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
      await expect(owner.getByText(/Yêu cầu gửi lời mời đã được tiếp nhận/)).toBeVisible();
      await accept(holder, await mail(accounts.holder.email, 'mời'), tripId);
      await accept(editor, await linkInvite(owner, tripId), tripId);
      await accept(member, await linkInvite(owner, tripId), tripId);
      await setEditors(owner, tripId, ['Editor C']);
      await outsider.goto(`/trips/${tripId}`);
      await expect(outsider.getByText('Demo local — dữ liệu thật, chuyển tiền TEST.')).toHaveCount(0);
      for (const page of [holder, member]) {
        await page.goto(`/trips/${tripId}/plan`);
        await expect(page.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Tạo hoạt động trên server', exact: true })).toHaveCount(0);
      }
    });
    await test.step('day-only, timed overnight, reorder, completion, reload and editor revocation', async () => {
      await editor.goto(`/trips/${tripId}/plan`);
      await editor.getByRole('button', { name: 'Tạo hoạt động trên server', exact: true }).click();
      const drawer = editor.getByRole('dialog', { name: 'Chỉnh sửa lịch trình' });
      await drawer.getByLabel('Tên hoạt động', { exact: true }).fill('Tham quan ngày-only');
      await drawer.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill('2026-11-03');
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click(); await expect(drawer).not.toBeVisible();
      await editor.reload();
      const item = editor.getByRole('listitem', { name: 'Tham quan ngày-only', exact: true });
      await expect(item).toContainText('2026-11-03 · Chưa xếp giờ');
      await member.reload(); await expect(member.getByRole('listitem', { name: 'Tham quan ngày-only' })).toBeVisible();
      await item.getByRole('button', { name: 'Sửa trên server' }).click();
      await drawer.getByLabel('Giờ bắt đầu trên server').fill('23:00');
      await drawer.getByLabel('Ngày kết thúc (nếu có giờ)').fill('2026-11-04');
      await drawer.getByLabel('Giờ kết thúc trên server').fill('01:00');
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click(); await expect(drawer).not.toBeVisible();
      await editor.getByRole('button', { name: 'Tạo hoạt động trên server', exact: true }).click();
      await drawer.getByLabel('Tên hoạt động', { exact: true }).fill('Hoạt động chưa chọn ngày');
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click(); await expect(drawer).not.toBeVisible();
      await editor.getByRole('listitem', { name: 'Hoạt động chưa chọn ngày' }).getByRole('button', { name: 'Đưa lên' }).click();
      await expect(editor.getByRole('region', { name: 'Hoạt động trên server' }).getByRole('listitem').first()).toContainText('Hoạt động chưa chọn ngày');
      await item.getByRole('button', { name: 'Hoàn tất', exact: true }).click(); await expect(item).toContainText('Đã hoàn tất');
      await item.getByRole('button', { name: 'Mở lại', exact: true }).click(); await expect(item).toContainText('Chưa hoàn tất');
      await item.getByRole('button', { name: 'Sửa trên server' }).click();
      await drawer.getByLabel('Tên hoạt động', { exact: true }).fill('Không được lưu sau thu hồi quyền');
      await setEditors(owner, tripId, []);
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click();
      await expect(editor.getByText(/không còn quyền thực hiện/)).toBeVisible();
      await editor.reload(); await expect(editor.getByRole('listitem', { name: 'Tham quan ngày-only' })).toBeVisible();
      await expect(editor.getByRole('button', { name: 'Sửa trên server' })).toHaveCount(0);
      await setEditors(owner, tripId, ['Editor C']);
    });
    await test.step('two-actor Plan conflict preserves draft; keyboard drawer focus and explicit reconciliation', async () => {
      await editor.reload();
      const item = editor.getByRole('listitem', { name: 'Tham quan ngày-only' });
      const edit = item.getByRole('button', { name: 'Sửa trên server' });
      await edit.focus(); await edit.press('Enter');
      const drawer = editor.getByRole('dialog', { name: 'Chỉnh sửa lịch trình' });
      await expect(drawer.getByLabel('Tên hoạt động', { exact: true })).toBeFocused();
      await drawer.getByLabel('Mô tả', { exact: true }).fill('Draft Editor conflict');
      await owner.goto(`/trips/${tripId}/plan`);
      await owner.getByRole('listitem', { name: 'Tham quan ngày-only' }).getByRole('button', { name: 'Sửa trên server' }).click();
      await owner.getByRole('dialog').getByLabel('Mô tả', { exact: true }).fill('Owner saves first');
      await owner.getByRole('button', { name: 'Lưu trên server', exact: true }).click();
      await expect(owner.getByRole('dialog')).not.toBeVisible();
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click();
      await expect(drawer.getByText(/Lịch trình đã thay đổi/)).toBeVisible();
      await drawer.getByRole('button', { name: 'Tải lại để đối chiếu' }).click();
      await expect(editor.getByText(/Nội dung bạn nhập vẫn được giữ/)).toBeVisible();
      await expect(drawer.getByLabel('Mô tả', { exact: true })).toHaveValue('Draft Editor conflict');
      await drawer.getByRole('button', { name: 'Đã đối chiếu, giữ nội dung nhập' }).click();
      await drawer.getByRole('button', { name: 'Lưu trên server' }).click();
      await expect(drawer).not.toBeVisible(); await expect(edit).toBeFocused();
      await owner.reload(); await expect(owner.getByText('Draft Editor conflict', { exact: true })).toBeVisible();
    });
    await test.step('Owner configures Fund; Holder consent; create two manual contributions', async () => {
      await fund(owner, tripId); await owner.getByRole('button', { name: 'Bật quỹ TEST', exact: true }).click();
      const setup = owner.getByRole('dialog', { name: 'Bật quỹ TEST', exact: true });
      await setup.getByLabel('Người giữ quỹ (Holder)').selectOption({ label: 'Holder B' });
      await setup.getByLabel('Ngân sách (VND)').fill('900000');
      await setup.getByLabel('Mã ngân hàng TEST').fill('VCB');
      await setup.getByLabel('Số tài khoản TEST').fill('123456789');
      await setup.getByLabel('Tên người nhận TEST').fill('HOLDER TEST');
      await confirmForm(owner, 'Bật quỹ TEST');
      await fund(holder, tripId); await holder.getByRole('button', { name: 'Xác nhận đích nhận', exact: true }).click(); await confirmForm(holder, 'Xác nhận đích nhận');
      await owner.reload(); await owner.getByRole('button', { name: 'Tạo đợt thu', exact: true }).click();
      const req = owner.getByRole('dialog', { name: 'Tạo đợt thu', exact: true });
      await req.getByLabel('Tên đợt thu').fill('Đợt thu demo1');
      await req.getByLabel('Ghi chú đợt thu').fill('TEST không chuyển tiền thật');
      await req.getByLabel('Khoản đóng · Editor C').fill('200000');
      await req.getByLabel('Khoản đóng · Member D').fill('300000');
      await confirmForm(owner, 'Tạo đợt thu');
      await expect(owner.getByRole('region', { name: 'Các khoản đóng góp' }).getByRole('button', { name: 'Báo đã chuyển TEST', exact: true })).toHaveCount(0);
    });
    await test.step('report reject reload report confirm; lost response after commit replays once', async () => {
      await fund(editor, tripId); await editor.getByRole('button', { name: 'Xem hướng dẫn TEST' }).click();
      await expect(editor.getByRole('dialog', { name: 'Hướng dẫn chuyển TEST' })).toContainText('HOLDER TEST');
      await editor.getByRole('button', { name: 'Đóng hướng dẫn chuyển test' }).click();
      await editor.getByRole('button', { name: 'Báo đã chuyển TEST', exact: true }).click(); await confirmForm(editor, 'Báo đã chuyển TEST');
      await holder.reload(); const c = holder.getByRole('region', { name: 'Các khoản đóng góp' }).getByRole('listitem').filter({ hasText: 'Editor C' });
      await c.getByRole('button', { name: 'Từ chối báo chuyển', exact: true }).click();
      await holder.getByRole('dialog').getByLabel('Lý do', { exact: true }).fill('Chưa nhận TEST lần đầu'); await confirmForm(holder, 'Từ chối báo chuyển');
      await editor.reload(); await expect(editor.getByText('Lý do từ chối gần nhất: Chưa nhận TEST lần đầu')).toBeVisible();
      await editor.getByRole('button', { name: 'Báo đã chuyển TEST', exact: true }).click(); await confirmForm(editor, 'Báo đã chuyển TEST');
      await holder.reload(); await c.getByRole('button', { name: 'Xác nhận đã nhận TEST', exact: true }).click();
      let dropped = false;
      await holder.route('**/api/v1/contributions/*/confirm-received', async route => {
        if (dropped) return route.continue(); dropped = true;
        const response = await route.fetch(); expect(response.status()).toBe(200);
        await route.abort('connectionreset'); // Real backend committed. No mock success response.
      });
      await holder.getByRole('dialog').getByRole('button', { name: 'Xác nhận · Xác nhận đã nhận TEST', exact: true }).click();
      await expect(holder.getByText(/Chưa rõ kết quả ghi/)).toBeVisible();
      await holder.reload();
      await holder.getByRole('button', { name: 'Kiểm tra lại kết quả', exact: true }).click();
      await expect(holder.getByText('Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.', { exact: true })).toBeVisible();
      await holder.unroute('**/api/v1/contributions/*/confirm-received');
      await fund(member, tripId); await member.getByRole('button', { name: 'Báo đã chuyển TEST', exact: true }).click(); await confirmForm(member, 'Báo đã chuyển TEST');
      await holder.reload(); const d = holder.getByRole('region', { name: 'Các khoản đóng góp' }).getByRole('listitem').filter({ hasText: 'Member D' });
      await d.getByRole('button', { name: 'Xác nhận đã nhận TEST', exact: true }).click(); await confirmForm(holder, 'Xác nhận đã nhận TEST');
      for (const page of [owner, holder, editor, member]) { await fund(page, tripId); await expect(page.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('500.000 ₫'); }
      const ledger = holder.getByRole('region', { name: 'Ledger', exact: true });
      await expect(ledger.getByRole('listitem')).toHaveCount(2);
      await expect(ledger).toContainText('IN · CONTRIBUTION · 200.000 ₫');
      await expect(ledger).toContainText('IN · CONTRIBUTION · 300.000 ₫');
    });
    await test.step('same-cookie tabs; sign out prevents stale restoration', async () => {
      const tab = await owner.context().newPage();
      await tab.goto('/profile'); await expect(tab.getByLabel('Tên hiển thị')).toHaveValue('Owner A');
      await Promise.all([owner.reload(), tab.reload()]);
      await expect(tab.getByLabel('Tên hiển thị')).toHaveValue('Owner A');
      await tab.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      await expect(tab).toHaveURL(/\/login$/);
      await owner.goto('/profile'); await expect(owner).toHaveURL(/\/login\?/);
      await tab.close(); await login(owner, accounts.owner, `/trips/${tripId}/members`);
    });
    await test.step('Holder blocked; Member leave; selected Editor remove/rejoin without old assignment', async () => {
      await holder.goto(`/trips/${tripId}/members`); await holder.getByRole('button', { name: 'Rời chuyến đi', exact: true }).click();
      await holder.getByLabel('Lý do rời/xóa').fill('TEST leave Holder'); await holder.getByRole('button', { name: 'Xác nhận rời/xóa' }).click();
      await expect(holder.getByText(/Nghĩa vụ hoặc trách nhiệm quỹ chưa được giải quyết/)).toBeVisible();
      await member.goto(`/trips/${tripId}/members`); await member.getByRole('button', { name: 'Rời chuyến đi', exact: true }).click();
      await member.getByLabel('Lý do rời/xóa').fill('TEST leave after confirmation'); await member.getByRole('button', { name: 'Xác nhận rời/xóa' }).click();
      await expect(member.getByText('Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.', { exact: true })).toBeVisible();
      await owner.reload(); await owner.getByRole('button', { name: 'Xóa thành viên · Editor C', exact: true }).click();
      await owner.getByLabel('Lý do rời/xóa').fill('TEST rejoin'); await owner.getByRole('button', { name: 'Xác nhận rời/xóa' }).click();
      await expect(owner.getByText('Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.', { exact: true })).toBeVisible();
      await accept(editor, await linkInvite(owner, tripId), tripId);
      await editor.goto(`/trips/${tripId}/plan`); await expect(editor.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
      await expect(editor.getByRole('button', { name: 'Tạo hoạt động trên server' })).toHaveCount(0);
    });
    await test.step('restart without reset preserves IDs/Plan/ledger; Finance loss does not empty Fund', async () => {
      await control('restart', 'apps');
      await fund(owner, tripId); await expect(owner.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('500.000 ₫');
      await expect(owner.getByRole('region', { name: 'Ledger' }).getByRole('listitem')).toHaveCount(2);
      await editor.reload(); await expect(editor.getByRole('listitem', { name: 'Tham quan ngày-only' })).toBeVisible();
      await control('stop', 'finance-service');
      try {
        const failedFund = owner.waitForResponse(r => /\/api\/v1\/trips\/[^/]+\/fund$/.test(new URL(r.url()).pathname));
        await owner.reload();
        expect((await failedFund).status()).toBe(503);
        await expect(owner.getByRole('heading', { name: 'Chưa thể tải nội dung' }).first()).toBeVisible();
        await expect(owner.getByRole('heading', { name: 'Chuyến đi chưa bật quỹ' })).toHaveCount(0);
        await expect(owner.getByRole('region', { name: 'Trạng thái quỹ thật' })).toHaveCount(0);
        await editor.reload(); await expect(editor.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
      } finally { await control('start', 'finance-service'); }
      // Existing gRPC channels reconnect asynchronously after a service restart.
      // A live HTTP listener does not prove the Gateway can perform a Fund read yet.
      await expect(async () => {
        await owner.getByRole('button', { name: 'Tải lại quỹ', exact: true }).click();
        await expect(owner.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('500.000 ₫', { timeout: 3000 });
      }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
      await control('stop', 'postgres');
      try {
        // Keep the in-memory login: inspect a failed business read, not just failed refresh.
        const response = owner.waitForResponse(r => /\/api\/v1\/trips\/[^/]+\/fund$/.test(new URL(r.url()).pathname));
        await owner.getByRole('button', { name: 'Tải lại quỹ', exact: true }).click();
        expect((await response).status()).toBeGreaterThanOrEqual(500);
        await expect(owner.getByRole('heading', { name: 'Chuyến đi chưa bật quỹ' })).toHaveCount(0);
      } finally { await control('start', 'postgres'); }
      await expect.poll(async () => (await fetch(manifest.gatewayUrl + '/health/ready')).status, { timeout: 45000 }).toBe(200);
      await owner.reload(); await expect(owner.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('500.000 ₫');
      await control('stop', 'rabbitmq');
      try {
        await owner.goto(`/trips/${tripId}/plan`);
        await expect(owner.getByRole('listitem', { name: 'Tham quan ngày-only' })).toBeVisible();
      } finally { await control('start', 'rabbitmq'); }
      await expect.poll(async () => (await fetch(manifest.gatewayUrl + '/health/ready')).status, { timeout: 45000 }).toBe(200);
      await writeFile(resolve(manifest.artifactDir, `${runtime}-business-proof.json`), JSON.stringify({ at: new Date().toISOString(), runId: manifest.runId, tripId, runtime, balance: '500000', ledgerEntries: 2, fundState: 'OPEN', actors: 5, noBusinessSqlSeed: true, rejectionReadAfterReload: true, restart: true }, null, 2));
    });
    await test.step('responsive viewport and deferred module honesty', async () => {
      for (const width of [320,402,768,1366,1440]) {
        await owner.setViewportSize({ width, height: 900 });
        await owner.goto(`/trips/${tripId}/fund`); await expect(owner.getByRole('region', { name: 'Trạng thái quỹ thật' })).toBeVisible();
        expect(await owner.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      }
      for (const path of ['map','dress-code','packing']) {
        // Use the navigation a person sees, and wait for the business read. A negative
        // selector alone passes during bootstrap and can unload a rotating refresh.
        await owner.locator(`a[href="/trips/${tripId}/${path}"]:visible`).first().click();
        await expect(owner.getByText(path === 'packing' ? 'Chưa có hành lý đã lưu' : path === 'map' ? 'Chưa có địa điểm được lưu trên server.' : 'Chưa có Dress Code trên server.', { exact: true })).toBeVisible();
        await expect(owner.locator('[data-preview]')).toHaveCount(0);
      }
      await owner.setViewportSize({ width: 1440, height: 1000 });
      await owner.locator(`a[href="/trips/${tripId}/plan"]:visible`).first().click();
      await expect(owner.getByRole('heading', { name: 'Lịch trình chung' })).toBeVisible();
      await owner.evaluate(() => { document.documentElement.style.zoom = '2'; });
      await owner.getByRole('button', { name: 'Tạo hoạt động trên server', exact: true }).click();
      const drawer = owner.getByRole('dialog', { name: 'Chỉnh sửa lịch trình' });
      await expect(drawer.getByLabel('Tên hoạt động', { exact: true })).toBeFocused();
      await drawer.getByRole('button', { name: 'Lưu trên server', exact: true }).scrollIntoViewIfNeeded();
      await expect(drawer.getByRole('button', { name: 'Lưu trên server', exact: true })).toBeInViewport();
      await owner.keyboard.press('Escape'); await expect(drawer).not.toBeVisible();
      await expect(owner.getByRole('button', { name: 'Tạo hoạt động trên server', exact: true })).toBeFocused();
      await owner.evaluate(() => { document.documentElement.style.zoom = ''; });
    });
    await test.step('Owner is also Holder: consent after destination version change; budget/edit/waive/cancel never create ledger', async () => {
      await outsider.goto('/trips/new');
      await outsider.getByLabel('Tên chuyến đi', { exact: true }).fill('Owner Holder one-day year boundary');
      await outsider.getByLabel('Ngày đi', { exact: true }).fill('2026-12-31');
      await outsider.getByLabel('Ngày về', { exact: true }).fill('2026-12-31');
      await outsider.getByLabel('Múi giờ IANA', { exact: true }).fill('America/New_York');
      await outsider.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
      await outsider.getByRole('link', { name: 'Mở chuyến đi' }).click();
      const selfTripId = new URL(outsider.url()).pathname.split('/')[2];
      await fund(outsider, selfTripId); await outsider.getByRole('button', { name: 'Bật quỹ TEST', exact: true }).click();
      const setup = outsider.getByRole('dialog', { name: 'Bật quỹ TEST', exact: true });
      await setup.getByLabel('Người giữ quỹ (Holder)').selectOption({ label: 'Outsider X updated' });
      await setup.getByLabel('Ngân sách (VND)').fill('9223372036854775807');
      await setup.getByLabel('Mã ngân hàng TEST').fill('VCB');
      await setup.getByLabel('Số tài khoản TEST').fill('987654321');
      await setup.getByLabel('Tên người nhận TEST').fill('SELF HOLDER TEST');
      await confirmForm(outsider, 'Bật quỹ TEST');
      await expect(outsider.getByRole('button', { name: 'Tạo đợt thu', exact: true })).toBeDisabled();
      await outsider.getByRole('button', { name: 'Xác nhận đích nhận', exact: true }).click(); await confirmForm(outsider, 'Xác nhận đích nhận');
      await outsider.getByRole('button', { name: 'Sửa đích nhận', exact: true }).click();
      await outsider.getByRole('dialog').getByLabel('Tên người nhận TEST').fill('SELF HOLDER TEST V2');
      await confirmForm(outsider, 'Sửa đích nhận TEST');
      await expect(outsider.getByRole('button', { name: 'Tạo đợt thu', exact: true })).toBeDisabled();
      await outsider.getByRole('button', { name: 'Xác nhận đích nhận', exact: true }).click(); await confirmForm(outsider, 'Xác nhận đích nhận');
      await outsider.getByRole('button', { name: 'Sửa ngân sách', exact: true }).click();
      await outsider.getByRole('dialog').getByLabel('Ngân sách (VND)').fill('1000000');
      const budgetAttempts = [];
      await outsider.route('**/api/v1/funds/*/budget', async route => {
        budgetAttempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() });
        if (budgetAttempts.length === 1) return route.abort('connectionreset'); // Before dispatch: no server commit.
        return route.continue();
      });
      await outsider.getByRole('dialog').getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
      await expect(outsider.getByText(/Chưa rõ kết quả ghi/)).toBeVisible();
      await outsider.reload();
      await outsider.getByRole('button', { name: 'Gửi lại đúng yêu cầu', exact: true }).click();
      await expect(outsider.getByText('Server đã xác nhận hoàn tất. Dữ liệu đang được đọc lại.', { exact: true })).toBeVisible();
      expect(budgetAttempts).toHaveLength(2); expect(budgetAttempts[1]).toEqual(budgetAttempts[0]);
      await outsider.unroute('**/api/v1/funds/*/budget');
      for (const action of ['Miễn khoản đóng', 'Hủy khoản đóng']) {
        await outsider.getByRole('button', { name: 'Tạo đợt thu', exact: true }).click();
        await outsider.getByRole('dialog').getByLabel('Tên đợt thu').fill(action);
        await outsider.getByRole('dialog').getByLabel('Khoản đóng · Outsider X updated').fill('10000');
        await confirmForm(outsider, 'Tạo đợt thu');
        const request = outsider.getByRole('region', { name: 'Đợt thu', exact: true }).getByRole('listitem').filter({ hasText: action });
        await request.getByRole('button', { name: 'Sửa đợt thu' }).click();
        await outsider.getByRole('dialog').getByLabel('Ghi chú đợt thu').fill('Metadata is not money');
        await confirmForm(outsider, 'Sửa đợt thu');
        const pending = outsider.getByRole('region', { name: 'Các khoản đóng góp' }).getByRole('listitem').filter({ hasText: 'Chờ báo chuyển' });
        await pending.getByRole('button', { name: 'Sửa số tiền', exact: true }).click();
        await outsider.getByRole('dialog').getByLabel('Số tiền mới (VND)').fill('20000'); await confirmForm(outsider, 'Sửa số tiền');
        await pending.getByRole('button', { name: action, exact: true }).click();
        await outsider.getByRole('dialog').getByLabel('Lý do', { exact: true }).fill('Demo-only obligation resolved'); await confirmForm(outsider, action);
      }
      await outsider.reload();
      await expect(outsider.getByRole('region', { name: 'Ledger' }).getByRole('listitem')).toHaveCount(0);
      await expect(outsider.getByRole('region', { name: 'Trạng thái quỹ thật' })).toContainText('0 ₫');
      await outsider.goto(`/trips/${selfTripId}/plan`);
      await expect(outsider.getByRole('group', { name: 'Ngày trong lịch trình' }).getByRole('button')).toHaveCount(3);
      await expect(outsider.getByRole('button', { name: '2026-12-31', exact: true })).toBeVisible();
    });
    await test.step('new EMAIL recipient registers/verifies/reopens link; wrong actor and revoked link cannot join', async () => {
      const email = `d1-new-${randomUUID()}@wolfari.test`;
      await owner.goto(`/trips/${tripId}/members`);
      await owner.getByRole('button', { name: 'Lời mời', exact: true }).click();
      await owner.getByLabel('Email người nhận').fill(email);
      await owner.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
      await expect(owner.getByText(/Yêu cầu gửi lời mời đã được tiếp nhận/)).toBeVisible();
      const link = await mail(email, 'mời');
      await outsider.goto(link);
      await expect(outsider.getByRole('button', { name: 'Chấp nhận', exact: true })).toHaveCount(0);
      const context = await browser.newContext({ baseURL: manifest.webUrl }); contexts.push(context);
      const page = await context.newPage();
      await page.goto(link);
      await expect(page.getByRole('link', { name: /Đăng ký/ }).first()).toBeVisible();
      await register(page, 'New invited account', email);
      await accept(page, link, tripId);
      await expect(page.getByText('Demo local — dữ liệu thật, chuyển tiền TEST.')).toBeVisible();
      const revokeLink = await linkInvite(owner, tripId);
      // The newly created LINK is the last in created order only after explicit filtering.
      const linkRow = owner.getByRole('listitem').filter({ hasText: 'Lời mời bằng liên kết' }).filter({ has: owner.locator('button:enabled').filter({ hasText: /^Thu hồi$/ }) }).first();
      await linkRow.getByRole('button', { name: 'Thu hồi', exact: true }).click();
      const revokeResponse = owner.waitForResponse(r => r.url().endsWith('/revoke') && r.request().method() === 'POST');
      await linkRow.getByRole('button', { name: 'Xác nhận thu hồi', exact: true }).click();
      expect((await revokeResponse).status()).toBe(200);
      await outsider.goto(revokeLink);
      await expect(outsider.getByRole('button', { name: 'Chấp nhận', exact: true })).toHaveCount(0);
      await context.close();
    });
    await test.step('same SPA account switch never shows another actor Create Trip draft', async () => {
      await owner.goto('/trips/new');
      await owner.evaluate(() => { window.__demo1DocumentSentinel = 'same-spa'; });
      await owner.getByLabel('Tên chuyến đi', { exact: true }).fill('Owner private unsent draft');
      await owner.locator('a[href="/profile"]:visible').first().click();
      await owner.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      await expect(owner).toHaveURL(/\/login$/);
      await owner.getByLabel('Email', { exact: true }).fill(accounts.member.email);
      await owner.getByLabel('Mật khẩu', { exact: true }).fill(accounts.member.password);
      await owner.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await owner.locator('a[href="/trips/new"]:visible').first().click();
      await expect(owner.getByLabel('Tên chuyến đi', { exact: true })).toHaveValue('');
      expect(await owner.evaluate(() => window.__demo1DocumentSentinel)).toBe('same-spa');
      await expect(owner.getByText('Owner private unsent draft', { exact: true })).toHaveCount(0);
    });
  } catch (error) {
    for (const [role,page] of Object.entries(pages)) if (!page.isClosed()) {
      // Never persist full DOM text: an open form may contain bank/account details.
      diagnostics.push({ role, path: new URL(page.url()).pathname });
    }
    await writeFile(resolve(manifest.artifactDir, runtime + '-diagnostics.json'), JSON.stringify(diagnostics,null,2));
    throw error;
  } finally { await Promise.allSettled(contexts.map(context => context.close())); }
});
