import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { PlanPage } from '../src/features/plan/PlanPage';
import {
  planDays,
  activitiesForDay,
  activityTime,
} from '../src/features/plan/model/plan-presentation';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createGatewayPlanRepository } from '../src/infrastructure/repositories/plan.gateway-repository';
import { selectPlanRepository } from '../src/infrastructure/repositories/select-plan-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import { planScenarios } from '../src/features/plan/model/plan';
const req = (scenario: (typeof planScenarios)[number] = 'success', tripId = previewTripId) => ({
  tripId,
  scenario,
  signal: new AbortController().signal,
});
describe('Plan projection and adapters', () => {
  it('keeps source activities, selected locations, permission and revision without fake writes', async () => {
    const repo = createFixturePlanRepository(),
      read = await repo.getPlan(req());
    expect(Object.keys(repo)).toEqual(['getPlan']);
    expect(read).toMatchObject({
      status: 'ready',
      data: {
        tripId: previewTripId,
        planVersion: 1,
        exportRevision: 1,
        permissions: { canRead: true, canEdit: true, canComplete: true },
      },
    });
    if (read.status !== 'ready') throw Error('Missing plan');
    expect(read.data.activities).toHaveLength(4);
    expect(read.data.selectedLocations).toHaveLength(6);
    expect(
      read.data.activities.every(
        (a) =>
          a.planVersion === read.data.planVersion && a.completedAt === null && a.status === 'TODO',
      ),
    ).toBe(true);
    const original = structuredClone(read);
    Object.assign(read.data.activities[0]!, { title: 'local edit', planVersion: 99 });
    expect(await repo.getPlan(req())).toEqual(original);
  });
  it.each(planScenarios.filter((s) => s !== 'loading'))(
    'keeps %s through both adapters',
    async (scenario) => {
      const fixture = createFixturePlanRepository(),
        gateway = createGatewayPlanRepository(fixture.getPlan);
      expect(await gateway.getPlan(req(scenario))).toEqual(await fixture.getPlan(req(scenario)));
    },
  );
  it('guards opaque IDs, Member vs selected Plan Editor and production factories', async () => {
    const memberTrip = '33333333-3333-4333-8333-333333333333';
    expect(await createFixturePlanRepository().getPlan(req('success', memberTrip))).toMatchObject({
      status: 'ready',
      data: { activities: [], permissions: { canRead: true, canEdit: false, canComplete: true } },
    });
    expect(
      await createFixturePlanRepository({ editorTripIds: [memberTrip] }).getPlan(
        req('success', memberTrip),
      ),
    ).toMatchObject({ status: 'ready', data: { permissions: { canEdit: true } } });
    expect(await createFixturePlanRepository().getPlan(req('success', 'unknown'))).toMatchObject({
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
    const factory = vi.fn(createFixturePlanRepository);
    expect(() => selectPlanRepository('fixture', false, factory)).toThrow();
    expect(factory).not.toHaveBeenCalled();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      expect(await createGatewayPlanRepository().getPlan(req())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('aborts pending reads and groups nullable schedules by the Trip timezone', async () => {
    const controller = new AbortController(),
      pending = createFixturePlanRepository().getPlan({
        ...req('loading'),
        signal: controller.signal,
      });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(planDays('2026-09-21T17:00:00Z', '2026-09-25T16:59:59Z', 'Asia/Ho_Chi_Minh')).toEqual([
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
    const result = await createFixturePlanRepository().getPlan(req());
    if (result.status !== 'ready') throw Error('Missing plan');
    expect(activitiesForDay(result.data.activities, '2026-09-22', 'Asia/Ho_Chi_Minh')).toHaveLength(
      4,
    );
    expect(
      activitiesForDay(
        [{ ...result.data.activities[0]!, startsAt: null }],
        '2026-09-22',
        'Asia/Ho_Chi_Minh',
      ),
    ).toEqual([]);
    expect(activityTime(null, 'Asia/Ho_Chi_Minh')).toBe('Chưa xếp giờ');
  });
});
function mount(guest = false, plan = createFixturePlanRepository()) {
  const shell = createFixtureShellRepository(),
    getPlan = vi.fn(plan.getPlan);
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={'/trips/' + previewTripId} />,
        children: [
          {
            path: '/trips/:tripId/plan',
            element: <PlanPage />,
            handle: { requiresViewer: true, contentTitle: true },
          },
        ],
      },
    ],
    { initialEntries: [`/trips/${previewTripId}/plan`] },
  );
  render(
    <Providers
      repository={{
        read: (r) => shell.read({ ...r, ...(guest ? { scenario: 'guest' as const } : {}) }),
      }}
      tripRepository={createFixtureTripRepository()}
      planRepository={{ getPlan }}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return getPlan;
}
it('keeps selected day on error/recovery and no writes/version change in pending/unknown preview', async () => {
  mount();
  await screen.findByText('Bán đảo Sơn Trà');
  await userEvent.click(screen.getByRole('button', { name: /Ngày 2/ }));
  await screen.findByText('Chưa có nội dung');
  await userEvent.click(screen.getByText('Plan preview · Dữ liệu minh họa'));
  for (const state of ['error', 'success'])
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái lịch trình'), state);
  expect(screen.getByRole('button', { name: /Ngày 2/ })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: /Ngày 1/ }));
  await userEvent.click(screen.getByLabelText('Xem hoạt động Bán đảo Sơn Trà'));
  expect(screen.getByLabelText('Xem hoạt động Bán đảo Sơn Trà').closest('details')).toHaveAttribute(
    'open',
  );
  screen
    .getAllByRole('button', { name: 'Chỉnh sửa hoạt động' })
    .forEach((button) => expect(button).toBeDisabled());
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái thao tác preview'), 'unknown');
  expect(screen.getByText(/Chưa xác nhận thay đổi/)).toBeInTheDocument();
  expect(screen.getByText(/Plan 1 · Membership 1 · Export 1/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Đã chọn · Chưa xếp lịch/ }));
  expect(screen.getByText('Chùa Linh Ứng')).toBeInTheDocument();
});
it('does not read Plan for Guest', async () => {
  const getPlan = mount(true);
  await screen.findByText('Bạn không có quyền truy cập');
  expect(getPlan).not.toHaveBeenCalled();
});
it('blocks a stale Plan revision before rendering activities', async () => {
  const fixture = createFixturePlanRepository();
  mount(false, {
    getPlan: async (request) => {
      const result = await fixture.getPlan(request);
      return result.status === 'ready'
        ? { ...result, data: { ...result.data, planVersion: result.data.planVersion + 1 } }
        : result;
    },
  });
  await screen.findByText('Dữ liệu đã thay đổi');
  expect(screen.queryByText('Bán đảo Sơn Trà')).not.toBeInTheDocument();
});
