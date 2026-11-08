import { expect, type Locator, type Page } from '@playwright/test';
import type { GatewayModel } from './gateway-fixture';
import { mockPlan } from './plan-fixture';

export const tripId = '11111111-1111-4111-8111-111111111111';
export const firstDay = '2026-11-01';
export const secondDay = '2026-11-02';
export const originalIds = [1, 2, 3, 4].map(
  (index) =>
    `55555555-${String(index).repeat(4)}-4${String(index).repeat(3)}-8${String(index).repeat(3)}-${String(index).repeat(12)}`,
);
export const poolId = '55555555-5555-4555-8555-555555555555';
export const locationId = '66666666-1111-4111-8111-111111111111';
export type PlanMock = Awaited<ReturnType<typeof mockPlan>>;

export async function seedPlan(page: Page, gateway: GatewayModel) {
  const mock = await mockPlan(page, gateway);
  const base = mock.activities[0]!;
  mock.activities.splice(
    0,
    mock.activities.length,
    ...['Đi dạo', 'Ăn sáng', 'Bảo tàng', 'Cà phê'].map((title, index) => ({
      ...base,
      id: originalIds[index]!,
      title,
      position: index,
      scheduled_date: null,
      starts_at: `2026-11-01T0${index + 1}:00:00Z`,
      ends_at: `2026-11-01T0${index + 1}:30:00Z`,
    })),
    { ...base, id: poolId, title: 'Hoạt động chưa xếp', position: 4 },
  );
  mock.selectedLocations.push({
    id: locationId,
    trip_id: tripId,
    name: 'Địa điểm mới',
    address: 'Đà Nẵng',
    latitude: '16.05',
    longitude: '108.2',
    provider: null,
    provider_place_id: null,
    source: 'MANUAL',
    fetched_at: null,
    metadata: {},
    plan_version: 1,
  });
  return mock;
}

export const list = (page: Page, day = firstDay) =>
  page.locator(`[data-gateway-list="${day}"]:visible`);
export const row = (page: Page, id: string) => page.locator(`[data-plan-activity="${id}"]:visible`);
export const handle = (page: Page, id: string, type = 'activity') =>
  page.locator(`[data-gateway-handle="${type}:${id}"]:visible`);

export async function pointAt(
  target: Locator,
  placement: 'before' | 'after' | 'middle' = 'middle',
) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height * (placement === 'before' ? 0.2 : placement === 'after' ? 0.8 : 0.5),
  };
}

export async function startPointer(page: Page, source: Locator) {
  await source.scrollIntoViewIfNeeded();
  await source.focus();
  const start = await pointAt(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 4 });
  await expect(page.locator('[data-dragging="true"]')).toHaveCount(1);
}

export async function pointerDrop(
  page: Page,
  source: Locator,
  target: Locator,
  placement: 'before' | 'after' | 'middle' = 'middle',
  requireInsertionMarker = true,
) {
  await startPointer(page, source);
  const destination = await pointAt(target, placement);
  await page.mouse.move(destination.x, destination.y, { steps: 14 });
  if (requireInsertionMarker)
    await expect(page.locator('[data-gateway-list][data-insertion-slot]')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('[data-gateway-list][data-insertion-slot]')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' })).toHaveCount(0);
}

export function activitiesForDay(mock: PlanMock, day: string | null) {
  return mock.activities
    .filter(
      (activity) => (activity.scheduled_date ?? activity.starts_at?.slice(0, 10) ?? null) === day,
    )
    .sort((a, b) => a.position - b.position);
}

export async function expectDayOrder(page: Page, mock: PlanMock, ids: string[], day = firstDay) {
  await expect.poll(() => activitiesForDay(mock, day).map((activity) => activity.id)).toEqual(ids);
  await expect
    .poll(() =>
      list(page, day)
        .locator('[data-plan-activity]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-plan-activity')),
        ),
    )
    .toEqual(ids);
  await expect(
    page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).first(),
  ).toBeEnabled();
  expect(new Set(mock.activities.map((activity) => activity.id)).size).toBe(mock.activities.length);
  expect(mock.activities.map((activity) => activity.position).sort((a, b) => a - b)).toEqual(
    mock.activities.map((_, index) => index),
  );
}

export function expectOriginalTimes(activity: PlanMock['activities'][number]) {
  const index = originalIds.indexOf(activity.id);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(activity.starts_at).toBe(`2026-11-01T0${index + 1}:00:00Z`);
  expect(activity.ends_at).toBe(`2026-11-01T0${index + 1}:30:00Z`);
}

export function expectClearedTimes(
  activities: PlanMock['activities'],
  day: string | null = firstDay,
) {
  for (const activity of activities)
    expect(activity).toMatchObject({ scheduled_date: day, starts_at: null, ends_at: null });
}

export async function openPool(page: Page) {
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await expect(list(page, 'POOL')).toBeVisible();
}
