import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuntimeTimeline } from '../src/features/plan/components/RuntimeTimeline';
import { planDays } from '../src/features/plan/model/plan-presentation';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

describe('read-only Gateway timeline navigation', () => {
  it('keeps day and unassigned filters available without enabling Plan writes', async () => {
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

    const trip = tripRead.data;
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
      onReorder = vi.fn(),
      onDay = vi.fn();

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
        onReorder={onReorder}
        onDay={onDay}
      />,
    );

    const days = within(screen.getByRole('group', { name: 'Ngày trong lịch trình' }));
    const dayButton = days.getByRole('button', { name: /Ngày 1 ·/ });
    const poolButton = days.getByRole('button', { name: 'Chưa chọn ngày' });
    expect(dayButton).toBeEnabled();
    expect(poolButton).toBeEnabled();
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Chưa xếp ngày' })).toBeInTheDocument();

    await user.click(dayButton);
    expect(dayButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listitem', { name: 'Trong ngày' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Chưa xếp ngày' })).not.toBeInTheDocument();

    poolButton.focus();
    await user.keyboard('{Enter}');
    expect(poolButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listitem', { name: 'Chưa xếp ngày' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Trong ngày' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kéo hoạt động/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
    for (const action of [onEdit, onDelete, onComplete, onMove, onReorder, onDay])
      expect(action).not.toHaveBeenCalled();
  });
});
