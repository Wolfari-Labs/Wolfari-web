import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const manifest = JSON.parse(await readFile(process.env.WOLFARI_DEMO1_MANIFEST, 'utf8'));
const round = Number(process.env.WOLFARI_W03_ROUND ?? '1');
async function mail(email, subject, excludedLink) {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    const result = await (await fetch(manifest.mailpitUrl + '/api/v1/messages?limit=500')).json();
    const item = result.messages.find(
      (m) => m.Subject.includes(subject) && m.To?.some((t) => t.Address === email),
    );
    if (item) {
      const body = await (await fetch(manifest.mailpitUrl + '/api/v1/message/' + item.ID)).json();
      const link = body.Text.match(/https?:\/\/\S+/)?.[0];
      if (link && link !== excludedLink) return link;
    }
    await new Promise((r) => setTimeout(r, 300));
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
async function register(page, label, email = `w03-${randomUUID()}@wolfari.test`) {
  const account = { name: label, email, password: `W03-${randomUUID()}-9!` };
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
async function manualCreate(page) {
  await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
  await page.getByRole('button', { name: 'Tạo hoạt động thủ công', exact: true }).click();
}
async function editActivity(page, title) {
  const trigger = page
    .getByRole('listitem', { name: title, exact: true })
    .getByRole('button', { name: `Thao tác ${title}`, exact: true });
  // Exercise the supported keyboard path; pointer overlap is tracked separately.
  await trigger.focus();
  await trigger.press('Enter');
  await page.getByRole('menuitem', { name: 'Chỉnh sửa hoạt động', exact: true }).click();
  return trigger;
}
async function confirmForm(page, label) {
  const dialog = page.getByRole('form', { name: label, exact: true });
  await dialog.getByRole('button', { name: 'Xác nhận · ' + label, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Kết quả thao tác', exact: true })
      .getByText('Đã hoàn tất thao tác.', { exact: true }),
  ).toBeVisible();
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
  await owner
    .getByRole('radio', {
      name: names.length ? 'Thành viên được chọn' : 'Chỉ chủ chuyến',
      exact: true,
    })
    .check();
  for (const name of names) await owner.getByRole('checkbox', { name, exact: true }).check();
  await owner.getByRole('button', { name: 'Lưu quyền', exact: true }).click();
  await expect(owner.getByText('Đã lưu quyền sửa lịch trình.')).toBeVisible();
}

async function capture(page, label) {
  await page.screenshot({
    path: test.info().outputPath(label + '.png'),
    fullPage: true,
    mask: [
      page.locator('input, textarea'),
      page.getByRole('region', { name: 'Đích nhận', exact: true }),
      page.getByRole('region', { name: 'Liên kết một lần' }),
    ],
  });
}
async function setup(browser, id, contexts) {
  const pages = {},
    accounts = {};
  for (const [role, name] of [
    ['owner', 'Owner A'],
    ['holder', 'Holder B'],
    ['editor', 'Editor C'],
    ['member', 'Member D'],
  ]) {
    const context = await browser.newContext({
      baseURL: manifest.webUrl,
      viewport: { width: 1440, height: 1000 },
      recordVideo: { dir: test.info().outputDir },
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    contexts.push(context);
    pages[role] = await context.newPage();
    accounts[role] = await register(pages[role], name);
  }
  const owner = pages.owner;
  await owner.goto('/trips/new');
  await owner.getByLabel('Tên chuyến đi', { exact: true }).fill(id + ' ' + manifest.runId);
  await owner.getByLabel('Ngày đi', { exact: true }).fill('2026-12-02');
  await owner.getByLabel('Ngày về', { exact: true }).fill('2026-12-05');
  await owner.getByLabel('Múi giờ', { exact: true }).selectOption('Asia/Ho_Chi_Minh');
  await owner.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  await owner.getByRole('link', { name: 'Mở chuyến đi', exact: true }).click();
  const tripId = new URL(owner.url()).pathname.split('/')[2];
  expect(tripId).toMatch(/^[0-9a-f-]{36}$/);
  for (const role of ['holder', 'editor', 'member'])
    await accept(pages[role], await linkInvite(owner, tripId), tripId);
  return { ...pages, accounts, tripId };
}
async function section(page, tripId, label) {
  await fund(page, tripId);
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function financeSetup(s) {
  await fund(s.owner, s.tripId);
  await s.owner.getByRole('button', { name: 'Bật quỹ TEST', exact: true }).click();
  const form = s.owner.getByRole('form', { name: 'Bật quỹ TEST', exact: true });
  await form.getByLabel('Người giữ quỹ (Holder)').selectOption({ label: 'Holder B' });
  await form.getByLabel('Ngân sách (VND)').fill('900000');
  await form.getByLabel('Mã ngân hàng TEST').fill('VCB');
  await form.getByLabel('Số tài khoản TEST').fill('123456789');
  await form.getByLabel('Tên người nhận TEST').fill('HOLDER TEST');
  await confirmForm(s.owner, 'Bật quỹ TEST');
  await section(s.holder, s.tripId, 'Thông tin nhận tiền');
  await s.holder.getByRole('button', { name: 'Xác nhận đích nhận', exact: true }).click();
  await confirmForm(s.holder, 'Xác nhận đích nhận');
  await section(s.owner, s.tripId, 'Đợt đóng góp');
  await s.owner.getByRole('button', { name: 'Tạo đợt thu', exact: true }).click();
  const request = s.owner.getByRole('form', { name: 'Tạo đợt thu', exact: true });
  await request.getByLabel('Tên đợt thu').fill('REPORT-WEB TEST');
  await request.getByLabel('Ghi chú đợt thu').fill('Dữ liệu cô lập, không chuyển tiền thật');
  await request.getByLabel('Khoản đóng · Editor C').fill('200000');
  await request.getByLabel('Khoản đóng · Member D').fill('300000');
  await confirmForm(s.owner, 'Tạo đợt thu');
}
async function proof(s, label) {
  const page = s.owner;
  // Separate the checkpoint from in-flight invalidation reads on the prior document.
  await page.goto('about:blank');
  const responseFor = (suffix) =>
    page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.status() === 200 &&
        new URL(r.url()).pathname.startsWith('/api/v1/') &&
        new URL(r.url()).pathname.endsWith(suffix),
    );
  const pending = Promise.all([
    responseFor('/fund'),
    responseFor('/contributions'),
    responseFor('/transactions'),
    responseFor('/destinations'),
  ]);
  await fund(page, s.tripId);
  const [f, c, l, d] = await Promise.all((await pending).map((r) => r.json()));
  const value = {
    label,
    at: new Date().toISOString(),
    tripId: s.tripId,
    fundId: f.data.id,
    status: f.data.status,
    budget: String(f.data.budget_amount),
    balance: String(f.data.current_balance),
    holder: f.data.holder_user_id,
    contributions: c.data.items.map((x) => ({
      id: x.id,
      member: x.member_user_id,
      amount: String(x.amount),
      status: x.status,
      reason: x.rejected_reason,
    })),
    ledger: l.data.items.map((x) => ({
      id: x.id,
      direction: x.direction,
      amount: String(x.amount),
      contribution: x.contribution_id,
    })),
    destinations: d.data.map((x) => ({ id: x.id, confirmed: !!x.confirmed_by_holder_at })),
    nextContributionCursor: c.data.next_cursor,
    nextLedgerCursor: l.data.next_cursor,
  };
  await writeFile(test.info().outputPath(label + '.json'), JSON.stringify(value, null, 2));
  expect(value.nextContributionCursor).toBeNull();
  expect(value.nextLedgerCursor).toBeNull();
  return value;
}
function row(page, name) {
  return page
    .getByRole('region', { name: 'Các khoản đóng góp', exact: true })
    .getByRole('listitem')
    .filter({ hasText: name });
}
async function report(s, role = 'editor') {
  await section(s[role], s.tripId, 'Đợt đóng góp');
  await s[role].getByRole('button', { name: 'Báo đã chuyển TEST', exact: true }).click();
  await confirmForm(s[role], 'Báo đã chuyển TEST');
}
async function confirm(s, name) {
  await section(s.holder, s.tripId, 'Đợt đóng góp');
  await row(s.holder, name)
    .getByRole('button', { name: 'Xác nhận đã nhận TEST', exact: true })
    .click();
  await confirmForm(s.holder, 'Xác nhận đã nhận TEST');
}
for (const id of ['W02', 'W03', 'W04', 'W05']) {
  const testTitle = id === 'W03' ? `REPORT-WEB W03 R${round} headed` : 'REPORT-WEB ' + id;
  test(testTitle, async ({ browser }) => {
    test.setTimeout(300000);
    if (id === 'W03' && ![1, 2, 3].includes(round)) throw Error('INVALID_W03_ROUND');
    const contexts = [];
    let s;
    try {
      s = await test.step('TD-' + id + ' isolated UI fixture', () => setup(browser, id, contexts));
      if (id === 'W02') {
        await setEditors(s.owner, s.tripId, ['Editor C']);
        await s.owner.goto('/trips/' + s.tripId + '/plan');
        await manualCreate(s.owner);
        const dialog = s.owner.getByRole('dialog', { name: 'Thêm hoạt động', exact: true });
        await dialog.getByLabel('Tên hoạt động', { exact: true }).fill('REPORT concurrency');
        await dialog.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill('2026-12-02');
        await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await s.editor.goto('/trips/' + s.tripId + '/plan');
        await editActivity(s.editor, 'REPORT concurrency');
        const draft = s.editor.getByRole('dialog', { name: 'Chỉnh sửa hoạt động', exact: true });
        await draft.getByLabel('Mô tả', { exact: true }).fill('Draft B retained');
        await editActivity(s.owner, 'REPORT concurrency');
        await s.owner
          .getByRole('dialog')
          .getByLabel('Mô tả', { exact: true })
          .fill('Version A saved');
        const a = s.owner.waitForResponse(
          (r) => r.request().method() === 'PATCH' && /\/activities\//.test(r.url()),
        );
        await s.owner.getByRole('dialog').getByRole('button', { name: 'Lưu', exact: true }).click();
        const ar = await a;
        expect(ar.status()).toBe(200);
        await expect(s.owner.getByRole('dialog')).not.toBeVisible();
        const b = s.editor.waitForResponse(
          (r) => r.request().method() === 'PATCH' && /\/activities\//.test(r.url()),
        );
        await draft.getByRole('button', { name: 'Lưu', exact: true }).click();
        const br = await b;
        expect(br.status()).toBe(409);
        await expect(draft.getByText(/Lịch trình đã thay đổi/)).toBeVisible();
        await expect(draft.getByLabel('Mô tả', { exact: true })).toHaveValue('Draft B retained');
        await capture(s.editor, 'W02-stale-version-draft-preserved');
        await s.owner.reload();
        await editActivity(s.owner, 'REPORT concurrency');
        await expect(s.owner.getByRole('dialog').getByLabel('Mô tả', { exact: true })).toHaveValue(
          'Version A saved',
        );
        const ab = ar.request().postDataJSON(),
          bb = br.request().postDataJSON();
        await writeFile(
          test.info().outputPath('W02-conflict.json'),
          JSON.stringify(
            {
              tripId: s.tripId,
              statusA: ar.status(),
              statusB: br.status(),
              error: (await br.json()).error?.code,
              versionA: ab.expected_plan_version ?? ab.expected_version,
              versionB: bb.expected_plan_version ?? bb.expected_version,
              preservedA: true,
              retainedDraftB: true,
            },
            null,
            2,
          ),
        );
        expect(ab.expected_plan_version ?? ab.expected_version).toBeDefined();
        expect(bb.expected_plan_version ?? bb.expected_version).toEqual(
          ab.expected_plan_version ?? ab.expected_version,
        );
        return;
      }
      await test.step('Fund and two obligations', () => financeSetup(s));
      const initial = await proof(s, id + '-initial');
      expect(initial.status).toBe('OPEN');
      expect(initial.balance).toBe('0');
      expect(initial.ledger).toHaveLength(0);
      expect(initial.contributions.map((x) => x.amount).sort()).toEqual(['200000', '300000']);
      expect(initial.contributions.map((x) => x.status)).toEqual(['PENDING', 'PENDING']);
      expect(initial.destinations).toHaveLength(1);
      expect(initial.destinations[0].confirmed).toBe(true);
      await capture(s.owner, id + '-fund-initial');
      if (id === 'W03') {
        if (round === 3) {
          await capture(s.owner, `W03-R${round}-owner-after-setup`);
        }
        if (round === 2) {
          await capture(s.holder, `W03-R${round}-holder-confirmed`);
        }
        if (round === 3) {
          await capture(s.owner, `W03-R${round}-owner-regression`);
        }
        const final = await proof(s, `W03-R${round}-final`);
        expect(final.status).toBe('OPEN');
        expect(final.budget).toBe('900000');
        expect(final.balance).toBe('0');
        expect(final.ledger).toHaveLength(0);
        expect(final.contributions.map((x) => x.amount).sort()).toEqual(['200000', '300000']);
        expect(final.contributions.map((x) => x.status)).toEqual(['PENDING', 'PENDING']);
        expect(final.destinations).toHaveLength(1);
        expect(final.destinations[0].confirmed).toBe(true);
        await capture(s.owner, `W03-R${round}-final`);
        return;
      }
      await report(s);
      let p = await proof(s, id + '-reported');
      expect(p.contributions.find((x) => x.amount === '200000').status).toBe('TRANSFER_REPORTED');
      if (id === 'W04') {
        await section(s.holder, s.tripId, 'Đợt đóng góp');
        await row(s.holder, 'Editor C')
          .getByRole('button', { name: 'Từ chối báo chuyển', exact: true })
          .click();
        await s.holder
          .getByRole('form', { name: 'Từ chối báo chuyển', exact: true })
          .getByLabel('Lý do', { exact: true })
          .fill('Chưa nhận TEST lần đầu');
        await confirmForm(s.holder, 'Từ chối báo chuyển');
        p = await proof(s, 'W04-rejected');
        expect(p.contributions.find((x) => x.amount === '200000')).toMatchObject({
          status: 'PENDING',
          reason: 'Chưa nhận TEST lần đầu',
        });
        await section(s.editor, s.tripId, 'Đợt đóng góp');
        await expect(
          s.editor.getByText('Lý do từ chối gần nhất: Chưa nhận TEST lần đầu'),
        ).toBeVisible();
        await capture(s.editor, 'W04-rejection-after-reload');
        await report(s);
        p = await proof(s, 'W04-reported-again');
        expect(p.contributions.find((x) => x.amount === '200000').status).toBe('TRANSFER_REPORTED');
        await confirm(s, 'Editor C');
      } else {
        await section(s.holder, s.tripId, 'Đợt đóng góp');
        await row(s.holder, 'Editor C')
          .getByRole('button', { name: 'Xác nhận đã nhận TEST', exact: true })
          .click();
        let dropped = false;
        await s.holder.route('**/api/v1/contributions/*/confirm-received', async (route) => {
          if (dropped) return route.continue();
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          dropped = true;
          await route.abort('connectionreset');
        });
        await s.holder
          .getByRole('button', { name: 'Xác nhận · Xác nhận đã nhận TEST', exact: true })
          .click();
        await expect(
          s.holder
            .getByRole('region', { name: 'Kết quả thao tác', exact: true })
            .getByText(/Chưa xác nhận được kết quả/),
        ).toBeVisible();
        expect(dropped).toBe(true);
        await capture(s.holder, 'W05-response-lost');
        await s.holder.reload();
        await s.holder.getByRole('button', { name: 'Kiểm tra lại kết quả', exact: true }).click();
        await expect(
          s.holder
            .getByRole('region', { name: 'Kết quả thao tác', exact: true })
            .getByText('Đã hoàn tất thao tác.', { exact: true }),
        ).toBeVisible();
        await s.holder.unroute('**/api/v1/contributions/*/confirm-received');
      }
      p = await proof(s, id + '-confirmed-one');
      expect(p.balance).toBe('200000');
      expect(p.contributions.find((x) => x.amount === '200000').status).toBe('CONFIRMED');
      expect(p.ledger).toHaveLength(1);
      expect(p.ledger[0]).toMatchObject({
        direction: 'IN',
        amount: '200000',
        contribution: p.contributions.find((x) => x.amount === '200000').id,
      });
      if (id === 'W05') {
        await report(s, 'member');
        await confirm(s, 'Member D');
        p = await proof(s, 'W05-confirmed-two');
        expect(p.balance).toBe('500000');
        expect(p.ledger).toHaveLength(2);
        expect(new Set(p.ledger.map((x) => x.contribution)).size).toBe(2);
        expect(p.ledger.map((x) => x.direction)).toEqual(['IN', 'IN']);
        expect(p.ledger.map((x) => x.amount).sort()).toEqual(['200000', '300000']);
      }
      await capture(s.owner, id + '-final');
    } catch (error) {
      if (s)
        for (const role of ['owner', 'holder', 'editor']) {
          if (/\/trips\/[0-9a-f-]+\/(plan|fund)$/.test(new URL(s[role].url()).pathname))
            await capture(s[role], id + '-failure-' + role).catch(() => {});
        }
      throw error;
    } finally {
      const evidence = [];
      for (const [role, context] of contexts.map((context, index) => [
        ['owner', 'holder', 'editor', 'member'][index],
        context,
      ])) {
        const tracePath = test.info().outputPath(`W03-${role}.trace.zip`);
        await context.tracing.stop({ path: tracePath }).catch(() => {});
        const page = s?.[role];
        const video = page?.video();
        await context.close().catch(() => {});
        evidence.push({
          role,
          tracePath,
          videoPath: video ? await video.path().catch(() => null) : null,
        });
      }
      await writeFile(
        test.info().outputPath('manifest.md'),
        `# W03\n\n- Tester: Nguyễn Thị Trang\n- Trip ID: ${s?.tripId ?? 'not-created'}\n- Evidence: ${JSON.stringify(evidence, null, 2)}\n`,
      );
    }
  });
}
