import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const manifest = JSON.parse(await readFile(process.env.WOLFARI_DEMO1_MANIFEST, 'utf8'));
const round = Number(process.env.WOLFARI_W02_ROUND ?? '1');
test.use({ headless: false });

const sharedDataset = {
  tripTitle: 'Khám phá Đà Lạt cùng bạn bè',
  place: 'Đà Lạt',
  startDate: '2026-11-15',
  endDate: '2026-11-18',
  breakfast: {
    title: 'Ăn sáng tại homestay',
    date: '2026-11-15',
    start: '08:00',
    end: '09:00',
    type: 'MEAL',
    description: 'Ăn sáng và chuẩn bị lịch trình trong ngày',
  },
  square: {
    title: 'Tham quan Quảng trường Lâm Viên',
    date: '2026-11-15',
    start: '10:00',
    end: '11:00',
    type: 'SIGHTSEEING',
    description: 'Tham quan và chụp ảnh tại Quảng trường Lâm Viên',
  },
  control: {
    title: 'Dạo hồ Xuân Hương',
    date: '2026-11-16',
    start: '09:00',
    end: '10:00',
    type: 'SIGHTSEEING',
    description: 'Hoạt động kiểm soát không tham gia chỉnh sửa',
  },
};

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
    await new Promise((resolve) => setTimeout(resolve, 300));
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

async function register(page, name) {
  const account = { name, email: `w02-${randomUUID()}@wolfari.test`, password: `W02-${randomUUID()}-9!` };
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill(account.name);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password);
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(account.password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await page.goto(await mail(account.email, 'Xác minh'));
  await page.getByRole('button', { name: 'Xác minh email', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, account);
  return account;
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

async function setEditors(owner, tripId, name) {
  await owner.goto(`/trips/${tripId}/members`);
  await owner.getByRole('button', { name: 'Quyền sửa lịch trình', exact: true }).click();
  await owner.getByRole('radio', { name: 'Thành viên được chọn', exact: true }).check();
  await owner.getByRole('checkbox', { name, exact: true }).check();
  await owner.getByRole('button', { name: 'Lưu quyền', exact: true }).click();
  await expect(owner.getByText('Đã lưu quyền sửa lịch trình.')).toBeVisible();
}

async function openPlan(page, tripId) {
  await page.goto(`/trips/${tripId}/plan`);
  await expect(page.getByRole('heading', { name: 'Lịch trình', exact: true, level: 1 })).toBeVisible();
  const sharedPlan = page.getByRole('button', { name: /chung/i });
  if (await sharedPlan.count()) {
    await sharedPlan.click();
    await expect(page.getByRole('button', { name: /thủ công/i })).toBeVisible();
  }
}

async function createActivity(page, fields, expectedCount) {
  const manual = page.getByRole('button', { name: 'Tạo hoạt động thủ công', exact: true });
  if (!(await manual.isVisible().catch(() => false))) {
    await page.locator('summary[aria-label="Tùy chọn lịch trình"]').click();
  }
  await manual.click();
  const form = page.getByRole('form', { name: 'Thêm hoạt động', exact: true });
  await form.getByLabel('Tên hoạt động', { exact: true }).fill(fields.title);
  await form.getByLabel('Ngày bắt đầu hoặc ngày chưa có giờ').fill(fields.date);
  await form.getByLabel('Giờ bắt đầu').fill(fields.start);
  await form.getByLabel('Giờ kết thúc').fill(fields.end);
  await form.getByLabel('Loại hoạt động').fill(fields.type);
  await form.getByRole('textbox', { name: 'Mô tả', exact: true }).fill(fields.description);
  const createResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/activities$/.test(new URL(response.url()).pathname),
  );
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  const response = await createResponse;
  expect(response.status()).toBe(201);
  const created = await response.json();
  await expect(form).not.toBeVisible();
  if (expectedCount !== undefined) {
    await expect(page.locator('[data-plan-activity]')).toHaveCount(expectedCount);
  }
  return created.data;
}

async function editActivity(page, title) {
  const trigger = page
    .locator(`li[aria-label="${title}"]`)
    .locator('button')
    .last();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Chỉnh sửa hoạt động', exact: true }).click();
}

async function capture(page, label) {
  await page.screenshot({
    path: test.info().outputPath(`${label}.png`),
    fullPage: true,
    mask: [page.locator('input[type="password"]')],
  });
}

async function readPlan(page, tripId) {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'GET' &&
      r.status() === 200 &&
      new URL(r.url()).pathname === `/api/v1/trips/${tripId}/plan`,
  );
  await page.reload();
  return (await response).json();
}

async function setup(browser) {
  const entries = [];
  const pages = {};
  const accounts = {};
  for (const [role, name] of [
    ['owner', 'Nguyễn Thị Trang'],
    ['editor', 'Huỳnh Bảo Quyên'],
  ]) {
    const context = await browser.newContext({
      baseURL: manifest.webUrl,
      viewport: { width: 1440, height: 1000 },
      recordVideo: { dir: test.info().outputDir },
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    entries.push({ context, page, role });
    pages[role] = page;
    accounts[role] = await register(page, name);
  }
  const owner = pages.owner;
  await owner.goto('/trips/new');
  await owner.getByLabel('Tên chuyến đi', { exact: true }).fill(sharedDataset.tripTitle);
  await owner.getByLabel('Ngày đi', { exact: true }).fill(sharedDataset.startDate);
  await owner.getByLabel('Ngày về', { exact: true }).fill(sharedDataset.endDate);
  await owner.getByLabel('Múi giờ', { exact: true }).selectOption('Asia/Ho_Chi_Minh');
  await owner.getByRole('button', { name: 'Tạo chuyến đi', exact: true }).click();
  await owner.getByRole('link', { name: 'Mở chuyến đi', exact: true }).click();
  const tripId = new URL(owner.url()).pathname.split('/')[2];
  await accept(pages.editor, await linkInvite(owner, tripId), tripId);
  await setEditors(owner, tripId, 'Huỳnh Bảo Quyên');
  return { ...pages, accounts, tripId, entries };
}

test(`REPORT-WEB W02 R${round} headed`, async ({ browser }) => {
  test.setTimeout(360000);
  if (![1, 2, 3].includes(round)) throw Error('INVALID_W02_ROUND');
  let session;
  try {
    session = await test.step(`TD-W02-R${round} · fixture Đà Lạt`, () => setup(browser));
    const { owner, editor, tripId } = session;
    await openPlan(owner, tripId);
    await createActivity(owner, sharedDataset.breakfast, 1);
    await createActivity(owner, sharedDataset.square, 2);
    let controlActivity;
    if (round === 3) {
      controlActivity = await createActivity(owner, sharedDataset.control);
    }
    await openPlan(editor, tripId);
    const initialOwner = await readPlan(owner, tripId);
    const initialEditor = await readPlan(editor, tripId);
    expect(initialOwner.data.plan_version).toBe(initialEditor.data.plan_version);
    expect(initialOwner.data.activities.length).toBe(round === 3 ? 3 : 2);
    if (round === 3) {
      const controlFromBackend = initialOwner.data.activities.find(
        (activity) => activity.id === controlActivity.id,
      );
      expect(controlFromBackend).toMatchObject({
        title: sharedDataset.control.title,
        starts_at: expect.any(String),
        ends_at: expect.any(String),
      });

      for (const page of [owner, editor]) {
        await expect(page.locator('[data-plan-activity]')).toHaveCount(2);
        await page.locator('[data-plan-day="2026-11-16"]').click();
        await expect(page.locator('[data-plan-activity]')).toHaveCount(1);
        await expect(page.locator(`li[aria-label="${sharedDataset.control.title}"]`)).toBeVisible();
        await capture(page, `W02-R3-${page === owner ? 'owner' : 'member'}-day-16-control`);
        await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
        await expect(page.locator('[data-plan-activity]')).toHaveCount(3);
        await capture(page, `W02-R3-${page === owner ? 'owner' : 'member'}-all-three-activities`);
      }
    }
    await capture(owner, `W02-R${round}-01-owner-version-V`);
    await capture(editor, `W02-R${round}-02-member-version-V`);

    await editActivity(editor, sharedDataset.square.title);
    const editorForm = editor.getByRole('form', { name: 'Sửa hoạt động', exact: true });
    const draftDescription = 'Bản nháp Quyên: thêm điểm chụp ảnh ven sông Hàn';
    await editorForm.getByRole('textbox', { name: 'Mô tả', exact: true }).fill(draftDescription);

    await editActivity(owner, sharedDataset.breakfast.title);
    const ownerForm = owner.getByRole('form', { name: 'Sửa hoạt động', exact: true });
    const ownerDescription = 'Trang đã chuẩn bị lịch trình buổi sáng tại homestay';
    await ownerForm.getByRole('textbox', { name: 'Mô tả', exact: true }).fill(ownerDescription);
    const ownerSave = owner.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/activities\//.test(r.url()),
    );
    await ownerForm.getByRole('button', { name: 'Lưu', exact: true }).click();
    const ownerResponse = await ownerSave;
    expect(ownerResponse.status()).toBe(200);
    await expect(ownerForm).not.toBeVisible();
    await capture(owner, `W02-R${round}-03-owner-saved`);

    const memberSave = editor.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/activities\//.test(r.url()),
    );
    await editorForm.getByRole('button', { name: 'Lưu', exact: true }).click();
    const memberResponse = await memberSave;
    const memberBody = await memberResponse.json();
    expect(memberResponse.status()).toBe(409);
    expect(memberBody.error?.code).toBe('VERSION_CONFLICT');
    await expect(editor.getByText('Lịch trình đã thay đổi.', { exact: false })).toBeVisible();
    await expect(editorForm.getByRole('textbox', { name: 'Mô tả', exact: true })).toHaveValue(draftDescription);
    await capture(editor, `W02-R${round}-04-member-conflict`);

    const afterOwner = await readPlan(owner, tripId);
    const afterEditor = await readPlan(editor, tripId);
    expect(afterOwner.data.plan_version).toBe(afterEditor.data.plan_version);
    const savedActivity = afterOwner.data.activities.find(
      (activity) => activity.title === sharedDataset.breakfast.title,
    );
    const staleActivity = afterOwner.data.activities.find(
      (activity) => activity.title === sharedDataset.square.title,
    );
    expect(savedActivity.description).toBe(ownerDescription);
    expect(staleActivity.description).not.toBe(draftDescription);
    expect(afterOwner.data.activities.length).toBe(round === 3 ? 3 : 2);
    if (round === 3) {
      const controlAfterReload = afterOwner.data.activities.find(
        (activity) => activity.id === controlActivity.id,
      );
      expect(controlAfterReload).toMatchObject({
        title: sharedDataset.control.title,
        starts_at: expect.any(String),
        ends_at: expect.any(String),
      });
      for (const page of [owner, editor]) {
        await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
        await expect(page.locator('[data-plan-activity]')).toHaveCount(3);
      }
    }
    await capture(owner, `W02-R${round}-05-owner-after-reload`);
    await capture(editor, `W02-R${round}-06-member-after-reload`);

    const ownerPayload = ownerResponse.request().postDataJSON();
    const memberPayload = memberResponse.request().postDataJSON();
    await writeFile(
      test.info().outputPath('W02-conflict.json'),
      JSON.stringify(
        {
          round,
          tripId,
          planVersionBefore: initialOwner.data.plan_version,
          planVersionAfter: afterOwner.data.plan_version,
          statusA: ownerResponse.status(),
          statusB: memberResponse.status(),
          errorB: memberBody.error?.code,
          expectedVersionA: ownerPayload.expected_plan_version,
          expectedVersionB: memberPayload.expected_plan_version,
          activityIds: afterOwner.data.activities.map((activity) => activity.id),
          backendActivityCount: afterOwner.data.activities.length,
          controlActivity: round === 3 ? {
            id: controlActivity.id,
            title: controlActivity.title,
            startsAt: controlActivity.starts_at,
            endsAt: controlActivity.ends_at,
          } : null,
          retainedDraftBInEditor: true,
          persistedDraftBInBackend: false,
        },
        null,
        2,
      ),
    );
  } finally {
    const evidence = [];
    for (const entry of session?.entries ?? []) {
      const tracePath = test.info().outputPath(`W02-R${round}-${entry.role}.trace.zip`);
      await entry.context.tracing.stop({ path: tracePath }).catch(() => {});
      const video = entry.page.video();
      await entry.context.close().catch(() => {});
      evidence.push({ role: entry.role, tracePath, videoPath: video ? await video.path().catch(() => null) : null });
    }
    await writeFile(
      test.info().outputPath('manifest.md'),
      `# W02 R${round}\n\n- Tester: Nguyễn Thị Trang\n- Fixture: ${sharedDataset.tripTitle}; ${sharedDataset.place}; 15/11/2026; Ăn sáng tại homestay 08:00–09:00; Tham quan Quảng trường Lâm Viên 10:00–11:00${round === 3 ? '; Dạo hồ Xuân Hương 09:00–10:00 ngày 16/11/2026' : ''}\n- Trip ID: ${session?.tripId ?? 'not-created'}\n- Evidence: ${JSON.stringify(evidence, null, 2)}\n`,
    );
  }
});
