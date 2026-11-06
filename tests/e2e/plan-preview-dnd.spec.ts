import { expect, test, type Locator, type Page } from '@playwright/test';

const tripId = '11111111-1111-4111-8111-111111111111';
const viewerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draftKey = `wolfari:plan-draft:v1:${viewerId}:${tripId}`;
const route = `/trips/${tripId}/plan`;
const firstDay = '2026-09-22';
const secondDay = '2026-09-23';
const activityId = (index: number) => `b0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const poolId = (index: number) =>
  `draft:a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const originalIds = [1, 2, 3, 4].map(activityId);
const originalTimes = [
  ['08:00', '10:30'],
  ['11:30', '13:00'],
  ['14:00', '16:00'],
  ['19:00', '20:30'],
];

type DraftActivity = {
  id: string;
  position: number;
  scheduledDate: string | null;
  startsAt: string | null;
  endsAt: string | null;
};
type Draft = { basePlanVersion: number; activities: DraftActivity[] };
type Point = { x: number; y: number };
type Safety = { apiRequests: string[]; errors: string[] };
const safetyByPage = new WeakMap<Page, Safety>();

const list = (page: Page, container: 'DAY' | 'POOL') =>
  page.locator(`[data-draft-list="${container}"]:visible`);
const row = (page: Page, id: string, container: 'DAY' | 'POOL' = 'DAY') =>
  list(page, container).locator(`[data-draft-activity="${id}"]`);
const handle = (page: Page, id: string, container: 'DAY' | 'POOL' = 'DAY') =>
  row(page, id, container).getByRole('button', { name: /^Kéo hoạt động / });
const card = (page: Page, id: string) => row(page, id).locator('[data-timeline-card]');

async function rawDraft(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), draftKey);
}

async function readDraft(page: Page): Promise<Draft | null> {
  const raw = await rawDraft(page);
  return raw ? (JSON.parse(raw) as Draft) : null;
}

function inDay(draft: Draft, day: string | null) {
  return draft.activities
    .filter((activity) => activity.scheduledDate === day)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

async function expectDayOrder(page: Page, expected: string[], day = firstDay) {
  await expect
    .poll(async () => {
      const draft = await readDraft(page);
      return draft ? inDay(draft, day).map((activity) => activity.id) : [];
    })
    .toEqual(expected);
  await expect
    .poll(() =>
      list(page, 'DAY')
        .locator('[data-draft-activity]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-draft-activity')),
        ),
    )
    .toEqual(expected);
  const draft = (await readDraft(page))!;
  expect(draft.basePlanVersion).toBe(1);
  expect(new Set(draft.activities.map((activity) => activity.id)).size).toBe(
    draft.activities.length,
  );
  expect(inDay(draft, day).map((activity) => activity.position)).toEqual(
    expected.map((_, index) => index),
  );
  return draft;
}

function expectOriginalTimes(activity: DraftActivity) {
  const index = originalIds.indexOf(activity.id);
  expect(index).toBeGreaterThanOrEqual(0);
  const times = originalTimes[index]!;
  expect(Date.parse(activity.startsAt!)).toBe(Date.parse(`${firstDay}T${times[0]}:00+07:00`));
  expect(Date.parse(activity.endsAt!)).toBe(Date.parse(`${firstDay}T${times[1]}:00+07:00`));
}

function expectClearedTimes(activities: DraftActivity[], day = firstDay) {
  for (const activity of activities)
    expect(activity).toMatchObject({ scheduledDate: day, startsAt: null, endsAt: null });
}

async function pointAt(target: Locator, placement: 'before' | 'after' | 'middle' = 'middle') {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height * (placement === 'before' ? 0.2 : placement === 'after' ? 0.8 : 0.5),
  };
}

async function startPointer(page: Page, source: Locator) {
  await source.scrollIntoViewIfNeeded();
  await source.focus();
  const start = await pointAt(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 4 });
  await expect(page.locator('[data-dragging="true"]')).toHaveCount(1);
}

async function pointerDrop(
  page: Page,
  source: Locator,
  target: Locator,
  placement: 'before' | 'after' | 'middle' = 'middle',
) {
  await startPointer(page, source);
  const destination = await pointAt(target, placement);
  await page.mouse.move(destination.x, destination.y, { steps: 14 });
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
}

async function openPool(page: Page) {
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await expect(list(page, 'POOL')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const safety = { apiRequests: [], errors: [] } as Safety;
  safetyByPage.set(page, safety);
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) safety.apiRequests.push(request.url());
  });
  page.on('pageerror', (error) => safety.errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(route);
  await expect(row(page, originalIds[0]!)).toBeVisible();
  await expect(list(page, 'DAY').locator('[data-draft-activity]')).toHaveCount(4);
});

test.afterEach(async ({ page }) => {
  const safety = safetyByPage.get(page)!;
  expect(safety.apiRequests, 'Preview dragging must not call the Gateway').toEqual([]);
  expect(safety.errors).toEqual([]);
});

test('Fixture: pointer reorders repeatedly without an editor and persists exact insertion order', async ({
  page,
}) => {
  const [a, b, c, d] = originalIds as [string, string, string, string];
  await pointerDrop(page, handle(page, a), card(page, c), 'after');
  let draft = await expectDayOrder(page, [b, c, a, d]);
  inDay(draft, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(inDay(draft, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();

  await pointerDrop(page, handle(page, a), card(page, b), 'before');
  draft = await expectDayOrder(page, [a, b, c, d]);
  expectClearedTimes(inDay(draft, firstDay));
  await expect(handle(page, a)).toBeFocused();

  await pointerDrop(page, handle(page, d), card(page, c), 'before');
  await expectDayOrder(page, [a, b, d, c]);
  await expect(handle(page, d)).toBeFocused();

  await pointerDrop(
    page,
    handle(page, a),
    list(page, 'DAY').getByText('Thả ở đây để xếp cuối ngày', { exact: true }),
  );
  await expectDayOrder(page, [b, d, c, a]);
  await expect(handle(page, a)).toBeFocused();
  await page.reload();
  draft = await expectDayOrder(page, [b, d, c, a]);
  expectClearedTimes(inDay(draft, firstDay));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const insertion of [
  { name: 'first', index: 0 },
  { name: 'middle', index: 2 },
  { name: 'end', index: 4 },
]) {
  test(`Fixture: pointer inserts a pool activity at the ${insertion.name} slot and only resets the suffix`, async ({
    page,
  }) => {
    await openPool(page);
    const added = poolId(5);
    const target =
      insertion.index === 4
        ? list(page, 'DAY').getByText('Thả ở đây để xếp cuối ngày', { exact: true })
        : card(page, originalIds[insertion.index]!);
    await pointerDrop(
      page,
      handle(page, added, 'POOL'),
      target,
      insertion.index === 4 ? 'middle' : 'before',
    );
    const expected = [...originalIds];
    expected.splice(insertion.index, 0, added);
    const draft = await expectDayOrder(page, expected);
    const scheduled = inDay(draft, firstDay);
    scheduled.slice(0, insertion.index).forEach(expectOriginalTimes);
    expectClearedTimes(scheduled.slice(insertion.index));
    expect(inDay(draft, null).map((activity) => activity.id)).toEqual([poolId(6)]);
    await expect(row(page, added, 'POOL')).toHaveCount(0);
    await expect(handle(page, added)).toBeFocused();
    await page.reload();
    await expectDayOrder(page, expected);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('Fixture: pointer inserts into an empty day and returns only that activity to the pool', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Ngày 2/ }).click();
  await openPool(page);
  const added = poolId(5);
  await pointerDrop(
    page,
    handle(page, added, 'POOL'),
    list(page, 'DAY').getByRole('heading', { name: 'Chưa có nội dung' }),
  );
  let draft = await expectDayOrder(page, [added], secondDay);
  expectClearedTimes(inDay(draft, secondDay), secondDay);
  inDay(draft, firstDay).forEach(expectOriginalTimes);
  await expect(handle(page, added)).toBeFocused();

  await pointerDrop(page, handle(page, added), row(page, poolId(6), 'POOL'), 'after');
  draft = await expectDayOrder(page, [], secondDay);
  expect(inDay(draft, null).map((activity) => activity.id)).toEqual([poolId(6), added]);
  expect(draft.activities.find((activity) => activity.id === added)).toMatchObject({
    scheduledDate: null,
    startsAt: null,
    endsAt: null,
  });
  inDay(draft, firstDay).forEach(expectOriginalTimes);
  await expect(handle(page, added, 'POOL')).toBeFocused();
});

test('Fixture: self-drop, Escape and dropping outside the lists do not save or clear any times', async ({
  page,
}) => {
  const a = originalIds[0]!;
  const before = await rawDraft(page);
  await startPointer(page, handle(page, a));
  const sameSlot = await pointAt(card(page, a), 'before');
  await page.mouse.move(sameSlot.x, sameSlot.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  expect(await rawDraft(page)).toBe(before);
  await expect(handle(page, a)).toBeFocused();

  await startPointer(page, handle(page, a));
  const candidate = await pointAt(card(page, originalIds[2]!), 'after');
  await page.mouse.move(candidate.x, candidate.y, { steps: 10 });
  await expect(list(page, 'DAY')).toHaveAttribute('data-insertion-slot', /\d+/);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  expect(await rawDraft(page)).toBe(before);
  await expect(handle(page, a)).toBeFocused();

  await startPointer(page, handle(page, a));
  await page.mouse.move(candidate.x, candidate.y, { steps: 10 });
  await expect(list(page, 'DAY')).toHaveAttribute('data-insertion-slot', /\d+/);
  await page.mouse.move(24, 24, { steps: 14 });
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  await page.mouse.up();
  expect(await rawDraft(page)).toBe(before);
  await expect(handle(page, a)).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Fixture: keyboard sorting commits only on Enter and restores the moved handle focus', async ({
  page,
}) => {
  const [a, b, c, d] = originalIds as [string, string, string, string];
  const before = await rawDraft(page);
  await handle(page, a).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await rawDraft(page)).toBe(before);
  await page.keyboard.press('Enter');
  const draft = await expectDayOrder(page, [b, c, a, d]);
  inDay(draft, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(inDay(draft, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();

  const saved = await rawDraft(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  expect(await rawDraft(page)).toBe(saved);
  await expect(handle(page, a)).toBeFocused();
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Fixture: keyboard pool transfers wait for Enter and keep the chosen insertion slot', async ({
  page,
}) => {
  await openPool(page);
  const added = poolId(5);
  const before = await rawDraft(page);
  await handle(page, added, 'POOL').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await rawDraft(page)).toBe(before);
  await expect(list(page, 'DAY')).toHaveAttribute('data-insertion-slot', '2');
  await page.keyboard.press('Enter');
  const expected = [...originalIds];
  expected.splice(2, 0, added);
  let draft = await expectDayOrder(page, expected);
  inDay(draft, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(inDay(draft, firstDay).slice(2));
  await expect(handle(page, added)).toBeFocused();

  const saved = await rawDraft(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  expect(await rawDraft(page)).toBe(saved);
  await expect(list(page, 'POOL')).toHaveAttribute('data-insertion-slot', '1');
  await page.keyboard.press('Enter');
  draft = await expectDayOrder(page, originalIds);
  expect(inDay(draft, null).map((activity) => activity.id)).toEqual([poolId(6), added]);
  await expect(handle(page, added, 'POOL')).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
});

test('Fixture: CDP touch reorders Preview activities with the same suffix-reset contract', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1400 });
  const [a, b, c, d] = originalIds as [string, string, string, string];
  const start = await pointAt(handle(page, a));
  const destination = await pointAt(card(page, c), 'after');
  const cdp = await page.context().newCDPSession(page);
  const touchPoint = ({ x, y }: Point) => ({ x, y, id: 1, radiusX: 5, radiusY: 5, force: 1 });
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint(start)],
    });
    // Honor the touch sensor's hold-to-drag delay rather than simulating a mouse.
    await page.waitForTimeout(350);
    for (let step = 1; step <= 16; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          touchPoint({
            x: start.x + ((destination.x - start.x) * step) / 16,
            y: start.y + ((destination.y - start.y) * step) / 16,
          }),
        ],
      });
    }
    await expect(page.locator('[data-dragging="true"]')).toHaveCount(1);
    await expect(list(page, 'DAY')).toHaveAttribute('data-insertion-slot', /\d+/);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
  const draft = await expectDayOrder(page, [b, c, a, d]);
  inDay(draft, firstDay).slice(0, 2).forEach(expectOriginalTimes);
  expectClearedTimes(inDay(draft, firstDay).slice(2));
  await expect(handle(page, a)).toBeFocused();
  await expect(page.locator('[data-draft-list][data-insertion-slot]')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Fixture: a filtered pool keeps insertion boundaries in the full pool order', async ({
  page,
}) => {
  await openPool(page);
  const pool = list(page, 'POOL');
  await pool.locator('xpath=ancestor::section[1]').getByRole('searchbox').fill('Chùa Linh Ứng');
  await expect(row(page, poolId(5), 'POOL')).toBeVisible();
  await expect(row(page, poolId(6), 'POOL')).toHaveCount(0);

  await pointerDrop(page, handle(page, originalIds[0]!), row(page, poolId(5), 'POOL'), 'after');
  const draft = await readDraft(page);
  expect(draft).not.toBeNull();
  expect(inDay(draft!, null).map((activity) => activity.id)).toEqual([
    poolId(5),
    originalIds[0],
    poolId(6),
  ]);
  expect(inDay(draft!, firstDay).map((activity) => activity.id)).toEqual(originalIds.slice(1));
  expect(draft!.activities.find((activity) => activity.id === originalIds[0])).toMatchObject({
    scheduledDate: null,
    startsAt: null,
    endsAt: null,
  });
});
