import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile(process.env.WOLFARI_DEMO1_MANIFEST, 'utf8'));
const requestedRound = process.env.WOLFARI_W05_ROUND ?? '1';
const rounds = requestedRound === 'all' ? [1, 2, 3] : [Number(requestedRound)];
if (rounds.some((round) => ![1, 2, 3].includes(round))) throw Error('INVALID_W05_ROUND');
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
async function register(page, label, email = `w05-${randomUUID()}@wolfari.test`) {
  const account = { name: label, email, password: `W05-${randomUUID()}-9!` };
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
      recordVideo: { dir: test.info().outputDir, size: { width: 1440, height: 1000 } },
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

const roleNames = ['owner', 'holder', 'editor', 'member', 'holder-fresh'];

async function showLedger(page, tripId, balance, count, label) {
  await fund(page, tripId);
  await expect(page.getByRole('region', { name: 'Trạng thái quỹ', exact: true })).toContainText(
    balance,
  );
  await expect(page.getByRole('region', { name: 'Lịch sử quỹ', exact: true })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Lịch sử quỹ', exact: true }).locator('tbody tr'),
  ).toHaveCount(count);
  await capture(page, `${label}-balance`);
  await page
    .getByRole('region', { name: 'Lịch sử quỹ', exact: true })
    .locator('tbody tr')
    .last()
    .scrollIntoViewIfNeeded();
}

test.describe.serial('W05 recovery rounds', () => {
  for (const round of rounds) {
    const artifact = (label) => `W05-R${round}-${label}`;
    test(`REPORT-WEB W05 R${round} headed`, async ({ browser }) => {
      test.setTimeout(360000);
      if (![1, 2, 3].includes(round)) throw Error('INVALID_W05_ROUND');
      const contexts = [];
      let s, replayRequest, faultEvidence, firstLedgerId;
      const startedAt = new Date().toISOString();
      try {
        s = await test.step(`TD-W05-R${round} isolated UI fixture`, () =>
          setup(browser, `W05 R${round}`, contexts));
        await test.step('Prepare fresh OPEN fund and C/D obligations through the Web UI', async () => {
          await financeSetup(s);
          const initial = await proof(s, artifact('setup'));
          expect(initial.status).toBe('OPEN');
          expect(initial.budget).toBe('900000');
          expect(initial.balance).toBe('0');
          expect(initial.ledger).toHaveLength(0);
          expect(initial.contributions.map((x) => x.amount).sort()).toEqual(['200000', '300000']);
          expect(initial.contributions.map((x) => x.status)).toEqual(['PENDING', 'PENDING']);
          expect(initial.destinations).toHaveLength(1);
          expect(initial.destinations[0].confirmed).toBe(true);
          await report(s);
        });
        const initial = await proof(s, artifact('initial'));
        const c = initial.contributions.find((x) => x.amount === '200000');
        const d = initial.contributions.find((x) => x.amount === '300000');
        expect(c.status).toBe('TRANSFER_REPORTED');
        expect(d.status).toBe('PENDING');
        expect(initial.balance).toBe('0');
        expect(initial.ledger).toHaveLength(0);
        await section(s.holder, s.tripId, 'Đợt đóng góp');
        await expect(row(s.holder, 'Editor C')).toContainText('200.000');
        await expect(row(s.holder, 'Member D')).toContainText('300.000');
        await row(s.holder, 'Editor C').scrollIntoViewIfNeeded();
        await capture(s.holder, artifact('01-C-reported-D-pending'));
        const routePattern = `**/api/v1/contributions/${c.id}/confirm-received`;
        await test.step('Commit C at the real Gateway, then drop exactly one response', async () => {
          await row(s.holder, 'Editor C')
            .getByRole('button', { name: 'Xác nhận đã nhận TEST', exact: true })
            .click();
          let dropped = false;
          await s.holder.route(routePattern, async (route) => {
            if (route.request().method() !== 'POST' || dropped) return route.continue();
            const request = route.request();
            const headers = await request.allHeaders();
            const response = await route.fetch();
            expect(response.status()).toBe(200);
            const originalReceipt = await response.json();
            replayRequest = {
              path: new URL(request.url()).pathname,
              body: request.postData() ?? '',
              headers: Object.fromEntries(
                Object.entries(headers).filter(([name]) =>
                  ['authorization', 'content-type', 'idempotency-key', 'x-csrf-token'].includes(
                    name,
                  ),
                ),
              ),
            };
            expect(replayRequest.headers['idempotency-key']).toBeTruthy();
            const payload = request.postDataJSON();
            faultEvidence = {
              at: new Date().toISOString(),
              tripId: s.tripId,
              contributionId: c.id,
              method: request.method(),
              path: replayRequest.path,
              serverStatus: response.status(),
              expectedVersion: payload.expected_version,
              expectedFinanceVersion: payload.expected_finance_version,
              idempotencyKeySha256: createHash('sha256')
                .update(replayRequest.headers['idempotency-key'])
                .digest('hex'),
              injectedError: 'connectionreset',
              injectedCount: 1,
              originalDataSha256: createHash('sha256')
                .update(JSON.stringify(originalReceipt.data))
                .digest('hex'),
              originalBodySha256: createHash('sha256').update(replayRequest.body).digest('hex'),
            };
            dropped = true;
            await route.abort('connectionreset');
            await writeFile(
              test.info().outputPath(artifact('fault') + '.json'),
              JSON.stringify(faultEvidence, null, 2),
            );
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
          await capture(s.holder, artifact('02-response-lost-unknown'));
          await s.holder.reload();
          await expect(
            s.holder.getByRole('button', { name: 'Kiểm tra lại kết quả', exact: true }),
          ).toBeVisible();
          if (round === 3) {
            await s.holder.reload();
            await expect(
              s.holder.getByRole('button', { name: 'Kiểm tra lại kết quả', exact: true }),
            ).toBeVisible();
            await capture(s.holder, artifact('02b-recovery-survives-extra-reload'));
          }
          await s.holder.getByRole('button', { name: 'Kiểm tra lại kết quả', exact: true }).click();
          await expect(
            s.holder
              .getByRole('region', { name: 'Kết quả thao tác', exact: true })
              .getByText('Đã hoàn tất thao tác.', { exact: true }),
          ).toBeVisible();
          await s.holder.unroute(routePattern);
          await capture(s.holder, artifact('03-recovery-completed'));
        });
        const recovered = await proof(s, artifact('confirmed-one'));
        expect(recovered.status).toBe('OPEN');
        expect(recovered.balance).toBe('200000');
        expect(recovered.contributions.find((x) => x.id === c.id).status).toBe('CONFIRMED');
        expect(recovered.contributions.find((x) => x.id === d.id).status).toBe('PENDING');
        expect(recovered.ledger).toHaveLength(1);
        expect(recovered.ledger[0]).toMatchObject({
          direction: 'IN',
          amount: '200000',
          contribution: c.id,
        });
        firstLedgerId = recovered.ledger[0].id;
        await section(s.holder, s.tripId, 'Đợt đóng góp');
        await row(s.holder, 'Editor C').scrollIntoViewIfNeeded();
        await capture(s.holder, artifact('03b-C-confirmed-D-pending'));
        await showLedger(s.holder, s.tripId, '200.000', 1, artifact('04-one-IN-balance-200000'));
        await capture(s.holder, artifact('04-one-IN-balance-200000'));
        await test.step('D reports and Holder confirms the second contribution through UI', async () => {
          await report(s, 'member');
          await row(s.member, 'Member D').scrollIntoViewIfNeeded();
          await capture(s.member, artifact('05-D-reported'));
          const reportedD = await proof(s, artifact('D-reported'));
          expect(reportedD.balance).toBe('200000');
          expect(reportedD.ledger).toHaveLength(1);
          expect(reportedD.contributions.find((x) => x.id === d.id).status).toBe(
            'TRANSFER_REPORTED',
          );
          await confirm(s, 'Member D');
        });
        const final = await proof(s, artifact('confirmed-two'));
        expect(final.status).toBe('OPEN');
        expect(final.balance).toBe('500000');
        expect(final.contributions.map((x) => x.status)).toEqual(['CONFIRMED', 'CONFIRMED']);
        expect(final.ledger).toHaveLength(2);
        expect(final.ledger.map((x) => x.direction)).toEqual(['IN', 'IN']);
        expect(final.ledger.map((x) => x.amount).sort()).toEqual(['200000', '300000']);
        expect(final.ledger.filter((x) => x.id === firstLedgerId)).toHaveLength(1);
        expect(new Set(final.ledger.map((x) => x.contribution)).size).toBe(2);
        const finalIds = final.ledger.map((x) => x.id).sort();
        const contributionSnapshot = final.contributions
          .map(({ id, member, amount, status }) => ({ id, member, amount, status }))
          .sort((a, b) => a.id.localeCompare(b.id));
        await section(s.holder, s.tripId, 'Đợt đóng góp');
        await row(s.holder, 'Editor C').scrollIntoViewIfNeeded();
        await capture(s.holder, artifact('06a-C-D-confirmed'));
        await showLedger(s.holder, s.tripId, '500.000', 2, artifact('06-two-IN-balance-500000'));
        await capture(s.holder, artifact('06-two-IN-balance-500000'));
        await test.step('Browser replays the exact original C request and keeps both ledger IDs', async () => {
          const replay = await s.holder.evaluate(async (saved) => {
            const response = await fetch(saved.path, {
              method: 'POST',
              headers: saved.headers,
              body: saved.body,
              credentials: 'same-origin',
            });
            return { status: response.status, body: await response.json() };
          }, replayRequest);
          expect(replay.status).toBe(200);
          const replayDataSha256 = createHash('sha256')
            .update(JSON.stringify(replay.body.data))
            .digest('hex');
          expect(replayDataSha256).toBe(faultEvidence.originalDataSha256);
          expect(createHash('sha256').update(replayRequest.body).digest('hex')).toBe(
            faultEvidence.originalBodySha256,
          );
          expect(
            createHash('sha256').update(replayRequest.headers['idempotency-key']).digest('hex'),
          ).toBe(faultEvidence.idempotencyKeySha256);
          const proofAfter = await proof(s, artifact('replay-no-duplicate'));
          expect(proofAfter.balance).toBe('500000');
          expect(proofAfter.ledger.map((x) => x.id).sort()).toEqual(finalIds);
          expect(proofAfter.contributions.map((x) => x.status)).toEqual(['CONFIRMED', 'CONFIRMED']);
          expect(
            proofAfter.contributions
              .map(({ id, member, amount, status }) => ({ id, member, amount, status }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          ).toEqual(contributionSnapshot);
          await writeFile(
            test.info().outputPath(artifact('replay-result') + '.json'),
            JSON.stringify(
              {
                at: new Date().toISOString(),
                status: replay.status,
                tripId: s.tripId,
                contributionId: c.id,
                sameActor: true,
                exactOriginalBodyAndKey: true,
                idempotencyKeySha256: faultEvidence.idempotencyKeySha256,
                ledgerIdsBefore: finalIds,
                ledgerIdsAfter: proofAfter.ledger.map((x) => x.id).sort(),
                balanceBefore: final.balance,
                balanceAfter: proofAfter.balance,
                originalDataSha256: faultEvidence.originalDataSha256,
                replayDataSha256,
                originalBodySha256: faultEvidence.originalBodySha256,
              },
              null,
              2,
            ),
          );
          await showLedger(s.holder, s.tripId, '500.000', 2, artifact('07-replay-no-duplicate'));
          await capture(s.holder, artifact('07-replay-no-duplicate'));
        });
        if (round === 2) {
          await test.step('Fresh Holder context independently reads final state', async () => {
            const context = await browser.newContext({
              baseURL: manifest.webUrl,
              viewport: { width: 1440, height: 1000 },
              recordVideo: { dir: test.info().outputDir, size: { width: 1440, height: 1000 } },
            });
            contexts.push(context);
            await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
            const holder = await context.newPage();
            await login(holder, s.accounts.holder, `/trips/${s.tripId}/fund`);
            const independent = await proof({ ...s, owner: holder }, artifact('fresh-holder'));
            expect(independent.balance).toBe('500000');
            expect(independent.ledger.map((x) => x.id).sort()).toEqual(finalIds);
            expect(independent.contributions.map((x) => x.status)).toEqual([
              'CONFIRMED',
              'CONFIRMED',
            ]);
            await showLedger(holder, s.tripId, '500.000', 2, artifact('08-fresh-holder-context'));
            await capture(holder, artifact('08-fresh-holder-context'));
          });
        }
        if (round === 3) {
          // Wait for authenticated overview data before leaving this document;
          // immediate hard navigations can cancel a rotating refresh response.
          const overviewResponse = s.holder.waitForResponse(
            (response) =>
              response.request().method() === 'GET' &&
              response.status() === 200 &&
              new URL(response.url()).pathname === `/api/v1/trips/${s.tripId}`,
          );
          await s.holder.goto(`/trips/${s.tripId}`);
          await (await overviewResponse).json();
          await expect(
            s.holder.locator(`a[href="/trips/${s.tripId}/fund"]:visible`).first(),
          ).toBeVisible();
          await showLedger(s.holder, s.tripId, '500.000', 2, artifact('08-revisit-after-replay'));
          const revisit = await proof({ ...s, owner: s.holder }, artifact('revisit-after-replay'));
          expect(revisit.balance).toBe('500000');
          expect(revisit.ledger.map((x) => x.id).sort()).toEqual(finalIds);
          await s.holder
            .getByRole('region', { name: 'Lịch sử quỹ', exact: true })
            .locator('tbody tr')
            .last()
            .scrollIntoViewIfNeeded();
          await capture(s.holder, artifact('08-revisit-after-replay'));
        }
        await writeFile(
          test.info().outputPath(artifact('summary') + '.json'),
          JSON.stringify(
            {
              runId: manifest.runId,
              caseId: 'W05',
              round,
              startedAt,
              completedAt: new Date().toISOString(),
              tripId: s.tripId,
              status: 'Passed',
              actual: {
                E1: 'Unknown outcome with recovery action',
                E2: 'C CONFIRMED; 200000; one IN',
                E3: 'C/D CONFIRMED; OPEN; 500000',
                E4: 'Two distinct IN: 200000 and 300000',
                E5: 'Same browser request replay HTTP 200; ledger IDs and balance unchanged',
              },
              variant:
                round === 2
                  ? 'New Holder browser context after complete case'
                  : round === 3
                    ? 'Extra reload before recovery and revisit after replay'
                    : 'Baseline',
              ledgerIds: finalIds,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        if (s)
          for (const role of roleNames.slice(0, 4)) {
            if (/\/trips\/[0-9a-f-]+\/fund$/.test(new URL(s[role].url()).pathname))
              await capture(s[role], artifact('failure-' + role)).catch(() => {});
          }
        throw error;
      } finally {
        const evidence = [];
        for (const [index, context] of contexts.entries()) {
          const role = roleNames[index] ?? `context-${index + 1}`;
          const tracePath = test.info().outputPath(artifact(role) + '.trace.zip');
          await context.tracing.stop({ path: tracePath }).catch(() => {});
          const page = context.pages()[0];
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
          `# Evidence W05 — Round ${round}\n\n- Tester: Nguyễn Thị Trang\n- Run ID: ${manifest.runId}\n- Trip ID: ${s?.tripId ?? 'not-created'}\n- Started: ${startedAt}\n- Browser: Chromium ${browser.version()}\n- Execution mode: headless (the test title retains the legacy headed naming convention of W02)\n- Video: 1440 × 1000\n- Fault injection: ${faultEvidence ? 'HTTP 200 from real Gateway, then exactly one connectionreset' : 'not reached'}\n- Evidence: ${JSON.stringify(evidence, null, 2)}\n`,
        );
      }
    });
  }
});
