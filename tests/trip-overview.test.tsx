import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../src/app/providers';
import { App } from '../src/app/App';
import { TripOverviewPage } from '../src/features/trips/TripOverviewPage';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createGatewayTripRepository } from '../src/infrastructure/repositories/trip.gateway-repository';
import { previewTripId, fixtureTripCatalog } from '../src/infrastructure/fixtures/trip-catalog';

const request = (
  tripId = previewTripId,
  scenario: Parameters<
    ReturnType<typeof createFixtureTripRepository>['getTrip']
  >[0]['scenario'] = 'success',
) => ({ tripId, scenario, signal: new AbortController().signal });
describe('Trip detail read contract', () => {
  it('uses the same readable records and revisions as list without invented aggregates', async () => {
    const repo = createFixtureTripRepository();
    for (const item of fixtureTripCatalog.filter((t) => t.permissions.canRead)) {
      const result = await repo.getTrip(request(item.id));
      expect(result).toMatchObject({
        status: 'ready',
        data: {
          id: item.id,
          name: item.name,
          startAt: item.startAt,
          endAt: item.endAt,
          planVersion: item.planVersion,
          membershipRevision: item.membershipRevision,
          exportRevision: item.exportRevision,
          permissions: item.permissions,
          description: null,
        },
      });
    }
    expect(await repo.getTrip(request('88888888-8888-4888-8888-888888888888'))).toMatchObject({
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
  });
  it.each(['empty', 'error', 'forbidden', 'not-found', 'conflict', 'unavailable'] as const)(
    'preserves %s and supports Gateway with same reader',
    async (scenario) => {
      const fixture = createFixtureTripRepository(),
        gateway = createGatewayTripRepository(undefined, fixture.getTrip);
      expect(await gateway.getTrip(request(previewTripId, scenario))).toEqual(
        await fixture.getTrip(request(previewTripId, scenario)),
      );
    },
  );
  it('aborts loading and Gateway defaults unavailable without HTTP', async () => {
    const c = new AbortController(),
      pending = createFixtureTripRepository().getTrip({
        ...request(previewTripId, 'loading'),
        signal: c.signal,
      });
    c.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      expect(await createGatewayTripRepository().getTrip(request())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
it('guards Guest before detail reads and renders unavailable summaries with real routes', async () => {
  const repo = createFixtureTripRepository(),
    getTrip = vi.fn(repo.getTrip),
    shell = createFixtureShellRepository();
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={'/trips/' + previewTripId} />,
        children: [
          {
            path: '/trips/:tripId',
            element: <TripOverviewPage />,
            handle: { contentTitle: true, requiresViewer: true },
          },
        ],
      },
    ],
    { initialEntries: ['/trips/' + previewTripId] },
  );
  render(
    <Providers
      repository={shell}
      tripRepository={{ ...repo, getTrip }}
      planRepository={createFixturePlanRepository()}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  await screen.findByRole('heading', { name: 'Đà Nẵng – Hội An' });
  expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeDisabled();
  expect(screen.getByRole('link', { name: '4 thành viên' })).toHaveAttribute(
    'href',
    `/trips/${previewTripId}/members`,
  );
  await userEvent.click(screen.getByText('Trip detail preview · Dữ liệu minh họa'));
  for (const [state, text] of [
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
  ] as const) {
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái tổng quan'), state);
    await screen.findByText(text);
  }
  await userEvent.click(screen.getByText('UI preview · Dữ liệu minh họa'));
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái preview'), 'guest');
  await screen.findByText('Bạn không có quyền truy cập');
  const count = getTrip.mock.calls.length;
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái preview'), 'admin');
  await screen.findByText('Bạn không có quyền truy cập');
  expect(getTrip).toHaveBeenCalledTimes(count);
});
