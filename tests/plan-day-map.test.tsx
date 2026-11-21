import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanDayMap, dayMapLocations } from '../src/features/plan/components/PlanDayMap';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import { GatewayContext } from '../src/app/gateway-context';
import type { RuntimeServices } from '../src/shared/types/runtime-services';

async function data() {
  const request = {
    tripId: previewTripId,
    scenario: 'success' as const,
    signal: new AbortController().signal,
  };
  const [tripRead, planRead] = await Promise.all([
    createFixtureTripRepository().getTrip(request),
    createFixturePlanRepository().getPlan(request),
  ]);
  if (tripRead.status !== 'ready' || planRead.status !== 'ready')
    throw Error('Fixture Trip and Plan are required');
  const [first, second, third] = planRead.data.activities;
  const plan = {
    ...planRead.data,
    activities: [
      {
        ...first!,
        startsAt: '2026-09-22T08:00:00+07:00',
        selectedLocationId: planRead.data.selectedLocations[0]!.id,
      },
      {
        ...second!,
        startsAt: '2026-09-23T08:00:00+07:00',
        selectedLocationId: planRead.data.selectedLocations[1]!.id,
      },
      {
        ...third!,
        startsAt: null,
        endsAt: null,
        scheduledDate: null,
        selectedLocationId: planRead.data.selectedLocations[2]!.id,
      },
    ],
  };
  return { trip: tripRead.data, plan };
}

describe('Plan day-map projection', () => {
  // Hermetic: a developer `.env.local` browser key must not change the fallback assertions.
  beforeEach(() => {
    vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY', '');
    vi.stubEnv('VITE_GEOAPIFY_BROWSER_KEY', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('scopes linked selected locations by scheduled day without projecting unscheduled items', async () => {
    const { trip, plan } = await data();
    expect(dayMapLocations(plan, '2026-09-22', trip.timezone).map((item) => item.id)).toEqual([
      plan.selectedLocations[0]!.id,
    ]);
    expect(dayMapLocations(plan, '2026-09-23', trip.timezone).map((item) => item.id)).toEqual([
      plan.selectedLocations[1]!.id,
    ]);
    expect(dayMapLocations(plan, 'ALL', trip.timezone).map((item) => item.id)).toEqual([
      plan.selectedLocations[0]!.id,
      plan.selectedLocations[1]!.id,
    ]);
    expect(dayMapLocations(plan, 'POOL', trip.timezone)).toEqual([]);
  });

  it('shows a truthful provider fallback and accessible linked-place list; close is operable', async () => {
    const { trip, plan } = await data();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlanDayMap trip={trip} plan={plan} day="2026-09-22" onClose={onClose} />);
    const panel = screen.getByRole('region', { name: 'Bản đồ lịch trình ngày 1' });
    expect(within(panel).getByRole('status')).toHaveTextContent('Bản đồ nền chưa khả dụng');
    expect(within(panel).getByText(plan.selectedLocations[0]!.name)).toBeInTheDocument();
    expect(within(panel).queryByText(plan.selectedLocations[1]!.name)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/phút di chuyển|km/)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Ẩn bản đồ' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps a linked place with invalid coordinates in the list without claiming a marker', async () => {
    const { trip, plan } = await data();
    const last = plan.selectedLocations[5]!;
    const activity = { ...plan.activities[0]!, selectedLocationId: last.id };
    render(
      <PlanDayMap
        trip={trip}
        plan={{ ...plan, activities: [activity] }}
        day="ALL"
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(last.name)).toBeInTheDocument();
    expect(screen.getByText('Chưa có tọa độ hợp lệ')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bản đồ nền chưa khả dụng');
  });

  describe('day route', () => {
    async function twoStops() {
      const { trip, plan } = await data();
      const [first, second] = plan.activities;
      return {
        trip,
        plan: {
          ...plan,
          activities: [
            { ...first!, position: 0 },
            {
              ...second!,
              position: 1,
              startsAt: '2026-09-22T10:00:00+07:00',
              endsAt: '2026-09-22T11:00:00+07:00',
            },
          ],
        },
      };
    }
    const mount = (
      route: ReturnType<typeof vi.fn>,
      props: Awaited<ReturnType<typeof twoStops>>,
      day = '2026-09-22',
    ) =>
      render(
        <GatewayContext.Provider value={{ places: { route } } as unknown as RuntimeServices}>
          <PlanDayMap trip={props.trip} plan={props.plan} day={day} onClose={() => undefined} />
        </GatewayContext.Provider>,
      );

    it('asks for the ordered day route once and shows the car estimate', async () => {
      const props = await twoStops();
      const route = vi.fn().mockResolvedValue({
        distanceM: 12_345,
        durationSeconds: 1_500,
        geometry: [
          { latitude: 16, longitude: 108 },
          { latitude: 16.1, longitude: 108.1 },
        ],
      });
      mount(route, props);
      expect(screen.getByText('Đang tính đường đi… (tạm nối thẳng)')).toBeInTheDocument();
      expect(
        await screen.findByText('12,3 km · 25 phút (ước lượng ô tô)', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
      expect(route).toHaveBeenCalledTimes(1);
      const [locations] = props.plan.selectedLocations;
      expect(route.mock.calls[0]![0][0]).toEqual({
        latitude: Number(locations!.latitude),
        longitude: Number(locations!.longitude),
      });
      expect(route.mock.calls[0]![0]).toHaveLength(2);
    });

    it('falls back to a labelled straight line when routing is unavailable', async () => {
      const props = await twoStops();
      const route = vi.fn().mockRejectedValue(new Error('503'));
      mount(route, props);
      await waitFor(
        () =>
          expect(screen.getByText('Đường chim bay — chưa kiểm tra di chuyển')).toBeInTheDocument(),
        { timeout: 2000 },
      );
    });

    it('never routes across days or for a single stop', async () => {
      const props = await twoStops();
      const route = vi.fn();
      const { unmount } = mount(route, props, 'ALL');
      expect(screen.queryByText(/Đường chim bay|ước lượng ô tô|Đang tính/)).not.toBeInTheDocument();
      unmount();
      mount(route, { ...props, plan: { ...props.plan, activities: [props.plan.activities[0]!] } });
      expect(screen.queryByText(/Đường chim bay|ước lượng ô tô|Đang tính/)).not.toBeInTheDocument();
      await new Promise((done) => setTimeout(done, 500));
      expect(route).not.toHaveBeenCalled();
    });
  });
});
