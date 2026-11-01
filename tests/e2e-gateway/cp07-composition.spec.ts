import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { expect, login, test, type GatewayModel } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const planPath = `/api/v1/trips/${tripId}/plan`;
const locationId = '66666666-1111-4111-8111-111111111111';
const activityId = '55555555-1111-4111-8111-111111111111';

const viewports = [
  { width: 1440, height: 960 },
  { width: 820, height: 900 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
  { width: 1366, height: 520 },
] as const;

const routes = [
  { name: 'map', flow: 'gateway-map-read' },
  { name: 'dress-code', flow: 'gateway-dress-read' },
  { name: 'packing', flow: 'packing-read' },
] as const;

async function mockPopulatedPlan(page: Page, gateway: GatewayModel) {
  const trip = gateway.trips.find((item) => item.id === tripId)!;
  await page.route(`**${planPath}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      json: {
        data: {
          trip_id: tripId,
          plan_version: trip.plan_version,
          export_revision: trip.export_revision,
          permissions: { can_read: true, can_edit: true, can_complete: true },
          activities: [
            {
              id: activityId,
              trip_id: tripId,
              title: 'Đi bộ sáng',
              position: 0,
              description: null,
              public_description: null,
              activity_type: 'WALK',
              selected_location_id: locationId,
              scheduled_date: '2026-11-02',
              starts_at: null,
              ends_at: null,
              status: 'TODO',
              source: 'MANUAL',
              plan_version: trip.plan_version,
              created_by_user_id: gateway.profile.id,
              completed_by_user_id: null,
              completed_at: null,
            },
          ],
          selected_locations: [
            {
              id: locationId,
              trip_id: tripId,
              name: 'Bãi biển Mỹ Khê',
              address: 'Đà Nẵng',
              latitude: '16.05',
              longitude: '108.20',
              provider: null,
              provider_place_id: null,
              source: 'MANUAL',
              opening_hours: null,
              fetched_at: null,
              metadata: {},
              plan_version: trip.plan_version,
            },
            {
              id: '66666666-2222-4222-8222-222222222222',
              trip_id: tripId,
              name: 'Ngũ Hành Sơn',
              address: 'Đà Nẵng',
              latitude: null,
              longitude: null,
              provider: null,
              provider_place_id: null,
              source: 'MANUAL',
              opening_hours: null,
              fetched_at: null,
              metadata: {},
              plan_version: trip.plan_version,
            },
          ],
          dress_codes: [
            {
              id: '88888888-1111-4111-8111-111111111111',
              trip_id: tripId,
              scope_type: 'TRIP',
              plan_date: null,
              activity_id: null,
              label: 'Trang phục thoáng mát',
              description: 'Áo nhẹ cho cả chuyến',
              public_description: null,
              source: 'MANUAL',
              plan_version: trip.plan_version,
            },
            {
              id: '88888888-2222-4222-8222-222222222222',
              trip_id: tripId,
              scope_type: 'DAY',
              plan_date: '2026-11-02',
              activity_id: null,
              label: 'Áo chống nắng',
              description: null,
              public_description: 'Mang theo trong ngày thứ hai',
              source: 'MANUAL',
              plan_version: trip.plan_version,
            },
          ],
          packing_items: [
            {
              id: '99999999-1111-4111-8111-111111111111',
              trip_id: tripId,
              name: 'Áo mưa',
              quantity: '2',
              unit: 'cái',
              note: 'Cho ngày mưa',
              category: 'Quần áo',
              assigned_member_id: trip.current_membership.id,
              due_at: '2026-11-01T10:00:00Z',
              status: 'COMPLETED',
              source: 'MANUAL',
              completed_by_user_id: gateway.profile.id,
              completed_at: '2026-11-01T08:00:00Z',
              plan_version: trip.plan_version,
            },
            {
              id: '99999999-2222-4222-8222-222222222222',
              trip_id: tripId,
              name: 'Sạc dự phòng',
              quantity: '1',
              unit: null,
              note: null,
              category: 'Điện tử',
              assigned_member_id: null,
              due_at: null,
              status: 'TODO',
              source: 'MANUAL',
              completed_by_user_id: null,
              completed_at: null,
              plan_version: trip.plan_version,
            },
          ],
        },
        meta: { correlation_id: 'cp07-composition' },
      },
    });
  });
}

async function expectPrimaryBeforeSecondary(
  primary: Locator,
  secondary: Locator,
  stacked: boolean,
) {
  const first = await primary.boundingBox();
  const second = await secondary.boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  if (stacked) expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1);
  else expect(second!.x).toBeGreaterThanOrEqual(first!.x + first!.width - 1);
}

async function checkKeyboard(page: Page, root: Locator, route: (typeof routes)[number]['name']) {
  const group = root.getByRole('group', {
    name:
      route === 'map'
        ? 'Lọc địa điểm đã lưu'
        : route === 'dress-code'
          ? 'Lọc phạm vi dress code'
          : 'Bộ lọc vật dụng',
  });
  if (route === 'map') await root.getByRole('searchbox', { name: 'Tìm địa điểm đã lưu' }).focus();
  else await group.getByRole('button', { name: 'Tất cả', exact: true }).focus();
  if (route === 'map') await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const next = group.getByRole('button', {
    name: route === 'map' ? 'Trong lịch' : route === 'dress-code' ? 'Cả chuyến' : 'Của tôi',
    exact: true,
  });
  await expect(next).toBeFocused();
  expect(await next.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Enter');
  await expect(next).toHaveAttribute('aria-pressed', 'true');
}

for (const route of routes) {
  for (const viewport of viewports) {
    test(`CP07 HTTP mock composition: ${route.name} ${viewport.width}x${viewport.height}`, async ({
      page,
      gateway,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({
        reducedMotion: viewport.width === 402 ? 'no-preference' : 'reduce',
      });
      await mockPopulatedPlan(page, gateway);
      await login(page);
      await page.goto(`/trips/${tripId}/${route.name}`);
      const root = page.locator(`[data-flow="${route.flow}"]`);
      await expect(root).toBeVisible();

      if (route.name === 'map') {
        await expect(root.getByText('Bãi biển Mỹ Khê', { exact: true }).first()).toBeVisible();
        await expect(root.getByText('Bản đồ nền chưa khả dụng')).toBeVisible();
        await expectPrimaryBeforeSecondary(
          root.getByRole('region', { name: 'Tìm kiếm & chọn địa điểm' }),
          root.getByRole('region', { name: 'Bản đồ địa điểm đã lưu' }),
          viewport.width <= 900,
        );
      } else if (route.name === 'dress-code') {
        await expect(root.getByText('Trang phục thoáng mát', { exact: true })).toBeVisible();
        await expectPrimaryBeforeSecondary(
          root.getByRole('region', { name: 'Hướng dẫn trang phục đã lưu' }),
          root.getByRole('complementary', { name: 'Khả năng Dress code' }),
          viewport.width <= 1100,
        );
      } else {
        await expect(root.getByText('Áo mưa', { exact: true })).toBeVisible();
        const summary = root.getByRole('region', { name: 'Tiến độ packing list' });
        const filters = root.getByRole('group', { name: 'Bộ lọc vật dụng' });
        expect((await filters.boundingBox())!.y).toBeGreaterThan((await summary.boundingBox())!.y);
        if (viewport.width <= 402) {
          const assignedItem = root
            .getByText('Áo mưa', { exact: true })
            .locator('..')
            .locator('..');
          const unassignedItem = root
            .getByText('Sạc dự phòng', { exact: true })
            .locator('..')
            .locator('..');
          await expect(assignedItem.getByText(/Người chuẩn bị:\s*Tôi/)).toBeVisible();
          await expect(assignedItem.getByText(/Hạn chuẩn bị:\s*01\/11\/2026/)).toBeVisible();
          await expect(unassignedItem.getByText(/Người chuẩn bị:\s*Chưa phân công/)).toBeVisible();
        }
      }

      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({ path: info.outputPath(`${route.name}-full.png`), fullPage: true });

      if (viewport.width === 1440 || viewport.width === 402) {
        const tags = ['wcag2a', 'wcag2aa', 'wcag21aa'];
        const full = await new AxeBuilder({ page }).withTags(tags).analyze();
        const fullViolations = JSON.stringify(full.violations, null, 2);
        await writeFile(info.outputPath('axe-page.json'), fullViolations);
        await info.attach('axe-page.json', {
          body: fullViolations,
          contentType: 'application/json',
        });
        const scoped = await new AxeBuilder({ page })
          .include(`[data-flow="${route.flow}"]`)
          .withTags(tags)
          .analyze();
        const routeViolations = JSON.stringify(scoped.violations, null, 2);
        await writeFile(info.outputPath('axe-route.json'), routeViolations);
        await info.attach('axe-route.json', {
          body: routeViolations,
          contentType: 'application/json',
        });
        expect(scoped.violations, `${route.name} ${viewport.width}px route axe`).toEqual([]);
      }

      if (viewport.width === 402) await checkKeyboard(page, root, route.name);

      const last =
        route.name === 'map'
          ? root.getByText(/Chỉ xem địa điểm đã lưu/)
          : route.name === 'dress-code'
            ? root.getByRole('complementary', { name: 'Khả năng Dress code' })
            : root.getByText(/Danh sách hiện chỉ hỗ trợ xem/);
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`${route.name}-end.png`) });
      expect(
        gateway.calls.filter(
          (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
        ),
      ).toEqual([]);
    });
  }
}
