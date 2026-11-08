import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlanMetrics } from '../src/features/plan/components/PlanMetrics';
import { planDays } from '../src/features/plan/model/plan-presentation';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

async function data() {
  const request = {
    tripId: previewTripId,
    scenario: 'success' as const,
    signal: new AbortController().signal,
  };
  const [trip, plan] = await Promise.all([
    createFixtureTripRepository().getTrip(request),
    createFixturePlanRepository().getPlan(request),
  ]);
  if (trip.status !== 'ready' || plan.status !== 'ready') throw Error('Missing fixture data');
  return { trip: trip.data, plan: plan.data };
}

function metric(label: string) {
  const copy = screen.getByText(label).parentElement;
  if (!copy) throw Error(`Missing metric ${label}`);
  return within(copy);
}

describe('Gateway Plan source metrics', () => {
  it('counts trip-wide selected places and only known activity time, without a travel estimate', async () => {
    const { trip, plan } = await data();
    render(<PlanMetrics trip={trip} plan={plan} day="ALL" />);

    expect(screen.getByRole('region', { name: 'Tóm tắt lịch trình · Cả chuyến' })).toBeVisible();
    expect(metric('Hoạt động · Cả chuyến').getByText('4')).toBeVisible();
    expect(metric('Địa điểm · Cả chuyến').getByText('6')).toBeVisible();
    expect(metric('Trải nghiệm · Cả chuyến').getByText('7 giờ 30 phút')).toBeVisible();
    expect(metric('Di chuyển · Cả chuyến').getByText('—')).toBeVisible();
    expect(screen.queryByText(/Chưa có dữ liệu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/9 giờ 15 phút|1 giờ 20 phút/)).not.toBeInTheDocument();
  });

  it('keeps day-only, overnight and pool scopes distinct and discloses missing hours', async () => {
    const { trip, plan } = await data();
    const [day1, day2, day3] = planDays(trip.startAt, trip.endAt, trip.timezone);
    const [first, second, third, fourth] = plan.activities;
    const mixed = {
      ...plan,
      activities: [
        first!,
        {
          ...second!,
          startsAt: null,
          endsAt: null,
          scheduledDate: day1!,
          selectedLocationId: first!.selectedLocationId,
        },
        {
          ...third!,
          startsAt: '2026-09-23T23:00:00+07:00',
          endsAt: '2026-09-24T01:00:00+07:00',
          scheduledDate: null,
          selectedLocationId: second!.selectedLocationId,
        },
        {
          ...fourth!,
          startsAt: null,
          endsAt: null,
          scheduledDate: null,
          selectedLocationId: null,
        },
      ],
    };
    const rendered = render(<PlanMetrics trip={trip} plan={mixed} day={day1!} />);

    expect(screen.getByRole('region', { name: 'Tóm tắt lịch trình · 22/9' })).toBeVisible();
    expect(metric('Hoạt động · 22/9').getByText('2')).toBeVisible();
    expect(metric('Địa điểm · 22/9').getByText('1')).toBeVisible();
    expect(metric('Trải nghiệm · 22/9').getByText('2 giờ 30 phút')).toBeVisible();
    expect(metric('Di chuyển · 22/9').getByText('—')).toBeVisible();
    expect(screen.getByText('1 hoạt động chưa tính giờ')).toBeVisible();

    rendered.rerender(<PlanMetrics trip={trip} plan={mixed} day={day2!} />);
    expect(metric('Hoạt động · 23/9').getByText('1')).toBeVisible();
    expect(metric('Trải nghiệm · 23/9').getByText('2 giờ')).toBeVisible();
    expect(screen.queryByText('1 hoạt động chưa tính giờ')).not.toBeInTheDocument();

    rendered.rerender(<PlanMetrics trip={trip} plan={mixed} day={day3!} />);
    expect(metric('Hoạt động · 24/9').getByText('0')).toBeVisible();
    expect(metric('Trải nghiệm · 24/9').getByText('—')).toBeVisible();

    rendered.rerender(<PlanMetrics trip={trip} plan={mixed} day="POOL" />);
    expect(metric('Hoạt động · Chưa chọn ngày').getByText('1')).toBeVisible();
    expect(metric('Địa điểm · Chưa chọn ngày').getByText('0')).toBeVisible();
    expect(metric('Trải nghiệm · Chưa chọn ngày').getByText('—')).toBeVisible();
    expect(metric('Di chuyển · Chưa chọn ngày').getByText('—')).toBeVisible();
    expect(screen.getByText('1 hoạt động chưa tính giờ')).toBeVisible();
  });

  it('uses unpadded calendar dates for all four labels without changing day-only counts', async () => {
    const { trip, plan } = await data();
    const novemberTrip = {
      ...trip,
      startAt: '2026-11-05T17:00:00Z',
      endAt: '2026-11-07T17:00:00Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };
    render(
      <PlanMetrics
        trip={novemberTrip}
        plan={{
          ...plan,
          activities: [
            { ...plan.activities[0]!, startsAt: null, endsAt: null, scheduledDate: '2026-11-06' },
          ],
        }}
        day="2026-11-06"
      />,
    );
    expect(screen.getByRole('region', { name: 'Tóm tắt lịch trình · 6/11' })).toBeVisible();
    expect(metric('Hoạt động · 6/11').getByText('1')).toBeVisible();
    expect(metric('Địa điểm · 6/11').getByText('1')).toBeVisible();
    expect(metric('Trải nghiệm · 6/11').getByText('—')).toBeVisible();
    expect(metric('Di chuyển · 6/11').getByText('—')).toBeVisible();
    expect(screen.getByText('1 hoạt động chưa tính giờ').tagName).toBe('SMALL');
    expect(
      screen.queryByText(/Ngày \d|Chưa có dữ liệu|có giờ|gắn hoạt động|đã chọn/),
    ).not.toBeInTheDocument();
  });
});
