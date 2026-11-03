import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanDayMap, dayMapLocations } from '../src/features/plan/components/PlanDayMap';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

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
  beforeEach(() => vi.stubEnv('VITE_GOOGLE_MAPS_BROWSER_KEY', ''));
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
});
