import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuntimeTimeline } from '../src/features/plan/components/RuntimeTimeline';
import { planDays } from '../src/features/plan/model/plan-presentation';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(min-width: 1201px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('read-only Gateway timeline navigation', () => {
  it('keeps day and all-day navigation available with an unassigned group and no Plan writes', async () => {
    const user = userEvent.setup();
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

    const trip = {
      ...tripRead.data,
      endAt: new Date(Date.parse(tripRead.data.startAt) + 4 * 86_400_000).toISOString(),
    };
    const firstDay = planDays(trip.startAt, trip.endAt, trip.timezone)[0]!;
    const base = planRead.data.activities[0]!;
    const plan = {
      ...planRead.data,
      permissions: { canRead: true, canEdit: false, canComplete: false },
      activities: [
        {
          ...base,
          id: 'day-activity',
          title: 'Trong ngày',
          position: 0,
          startsAt: null,
          endsAt: null,
          scheduledDate: firstDay,
        },
        {
          ...base,
          id: 'pool-activity',
          title: 'Chưa xếp ngày',
          position: 1,
          startsAt: null,
          endsAt: null,
          scheduledDate: null,
        },
      ],
    };
    const onEdit = vi.fn(),
      onDelete = vi.fn(),
      onComplete = vi.fn(),
      onMove = vi.fn(),
      onArrange = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);

    render(
      <RuntimeTimeline
        trip={trip}
        plan={plan}
        disabled={false}
        canEdit={false}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
        onMove={onMove}
        onArrange={onArrange}
      />,
    );

    const days = within(screen.getByRole('group', { name: 'Ngày trong lịch trình' }));
    const dayButton = days.getByRole('button', { name: /Ngày 1 ·/ });
    const allButton = days.getByRole('button', { name: 'Tất cả' });
    expect(dayButton).toBeEnabled();
    expect(allButton).toBeEnabled();
    expect(days.queryByRole('button', { name: 'Thêm ngày' })).not.toBeInTheDocument();
    expect(days.queryByRole('button', { name: 'Chưa chọn ngày' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Phạm vi lịch trình')).not.toBeInTheDocument();
    expect(dayButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Chưa xếp ngày' })).not.toBeInTheDocument();
    await user.click(allButton);
    expect(screen.getByRole('heading', { name: 'Lịch trình chung' })).toBeInTheDocument();
    const unassigned = screen
      .getByRole('heading', { name: /^Chưa chọn ngày$/ })
      .closest('section')!;
    expect(within(unassigned).getByRole('listitem', { name: 'Chưa xếp ngày' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Chưa xếp ngày' })).toBeInTheDocument();

    await user.click(dayButton);
    expect(dayButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Chưa xếp ngày' })).not.toBeInTheDocument();

    allButton.focus();
    await user.keyboard('{Enter}');
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listitem', { name: 'Chưa xếp ngày' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kéo hoạt động/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Chỉnh sửa hoạt động' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
    for (const action of [onEdit, onDelete, onComplete, onMove, onArrange])
      expect(action).not.toHaveBeenCalled();
  });
});
