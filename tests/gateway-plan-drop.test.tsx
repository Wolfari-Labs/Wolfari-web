import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { Providers } from '../src/app/providers';
import { GatewayPlanPanel } from '../src/features/plan/components/GatewayPlanPanel';
import type { RuntimeTimeline } from '../src/features/plan/components/RuntimeTimeline';
import { planDays } from '../src/features/plan/model/plan-presentation';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import type {
  ActivityViewModel,
  PlanCommandResult,
  PlanRepository,
  PlanViewModel,
} from '../src/features/plan/model/plan';

type TimelineProps = ComponentProps<typeof RuntimeTimeline>;
const timeline: { props: TimelineProps | null } = { props: null };

// Drag gestures are covered by the Gateway HTTP-mock E2E; here we drive the drop contract.
vi.mock('../src/features/plan/components/RuntimeTimeline', () => ({
  RuntimeTimeline: (props: TimelineProps) => {
    timeline.props = props;
    const ordered = [...props.plan.activities].sort((a, b) => a.position - b.position);
    return (
      <div>
        {props.feedback}
        <ol aria-label="Thứ tự hiển thị">
          {ordered.map((a) => (
            <li key={a.id}>{`${a.title}@${a.scheduledDate ?? (a.startsAt ? 'TIMED' : 'POOL')}`}</li>
          ))}
        </ol>
      </div>
    );
  },
}));

async function setup() {
  const tripRepository = createFixtureTripRepository();
  const planRepository = createFixturePlanRepository();
  const input = {
    tripId: previewTripId,
    scenario: 'success' as const,
    signal: new AbortController().signal,
  };
  const [p, t] = await Promise.all([planRepository.getPlan(input), tripRepository.getTrip(input)]);
  if (p.status !== 'ready' || t.status !== 'ready') throw Error('fixture missing');
  const trip = { ...t.data, archivedAt: null };
  const [d1, d2] = planDays(trip.startAt, trip.endAt, trip.timezone);
  const base = p.data.activities[0]!;
  const make = (
    id: string,
    position: number,
    scheduledDate: string | null,
    timed = false,
  ): ActivityViewModel => ({
    ...base,
    id,
    title: id,
    position,
    status: 'TODO',
    scheduledDate: timed ? null : scheduledDate,
    startsAt: timed ? `${d1}T03:00:00Z` : null,
    endsAt: timed ? `${d1}T04:00:00Z` : null,
  });
  const plan: PlanViewModel = {
    ...p.data,
    planVersion: 7,
    permissions: { canRead: true, canEdit: true, canComplete: true },
    activities: [
      make('a1', 0, d1!),
      make('a2', 1, d1!),
      make('b1', 2, d2!),
      make('t1', 3, null, true),
    ],
  };
  let resolveUpdate: ((value: PlanCommandResult<ActivityViewModel>) => void) | null = null;
  const update = vi.fn<NonNullable<PlanRepository['updateActivity']>>(
    () =>
      new Promise((done) => {
        resolveUpdate = done;
      }),
  );
  const reorder = vi.fn<NonNullable<PlanRepository['reorderActivities']>>();
  const repo = {
    ...planRepository,
    createActivity: vi.fn(),
    updateActivity: update,
    reorderActivities: reorder,
    deleteActivity: vi.fn(),
    setActivityCompletion: vi.fn(),
  } as PlanRepository;
  const refresh = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  render(
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={tripRepository}
      planRepository={repo}
    >
      <GatewayPlanPanel trip={trip} plan={plan} refresh={refresh} onBusyChange={() => undefined} />
    </Providers>,
  );
  const order = () =>
    within(screen.getByRole('list', { name: 'Thứ tự hiển thị' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent);
  const drop = (id: string, day: string, index: number) =>
    act(() => {
      const props = timeline.props!;
      props.onPlace(
        props.plan.activities.find((a) => a.id === id)!,
        day,
        index,
      );
    });
  const settle = (value: PlanCommandResult<ActivityViewModel>) =>
    act(async () => {
      resolveUpdate!(value);
    });
  return { d1: d1!, d2: d2!, plan, update, reorder, refresh, order, drop, settle };
}
const ok = (data: ActivityViewModel) => ({ status: 'success' as const, data, correlationId: null });
const failure = (code: 'PERMISSION_DENIED' | 'VERSION_CONFLICT') => ({
  status: 'error' as const,
  error: { code, retryable: false, correlationId: 'drop-trace' },
});

describe('Gateway Plan drop saves straight to the backend', () => {
  // Recovery records and in-flight markers are per Trip; isolate each case.
  beforeEach(() => window.sessionStorage.clear());
  it('sends one PATCH with day and Trip-wide position and shows the new order at once', async () => {
    const { d1, d2, plan, update, reorder, refresh, order, drop, settle } = await setup();
    await drop('a1', d2, 1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).toMatchObject({
      activityId: 'a1',
      expectedPlanVersion: 7,
      fields: { scheduledDate: d2, position: 2 },
    });
    expect(Object.keys(update.mock.calls[0]![0].fields).sort()).toEqual([
      'position',
      'scheduledDate',
    ]);
    expect(update.mock.calls[0]![0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(reorder).not.toHaveBeenCalled();
    expect(order()).toEqual([`a2@${d1}`, `b1@${d2}`, `a1@${d2}`, 't1@TIMED']);
    await settle(ok(plan.activities[0]!));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reorders inside a day with position only', async () => {
    const { d1, plan, update, order, drop, settle } = await setup();
    await drop('a2', d1, 0);
    expect(update.mock.calls[0]![0].fields).toEqual({ position: 0 });
    expect(order().slice(0, 2)).toEqual([`a2@${d1}`, `a1@${d1}`]);
    await settle(ok(plan.activities[1]!));
  });

  it('ignores a drop back onto the same place', async () => {
    const { d1, update, drop } = await setup();
    await drop('a1', d1, 0);
    expect(update).not.toHaveBeenCalled();
  });

  it('restores the server order when the member is not allowed to edit', async () => {
    const { d1, d2, update, order, drop, settle } = await setup();
    await drop('b1', d1, 0);
    expect(order()[0]).toBe(`b1@${d1}`);
    await settle(failure('PERMISSION_DENIED'));
    expect(update).toHaveBeenCalledTimes(1);
    expect(order()).toEqual([`a1@${d1}`, `a2@${d1}`, `b1@${d2}`, 't1@TIMED']);
    expect(screen.getByText('Bạn không còn quyền thực hiện thao tác này.')).toBeInTheDocument();
  });

  it('reloads once on VERSION_CONFLICT, explains it and never resends', async () => {
    const { d2, update, refresh, drop, settle } = await setup();
    await drop('a1', d2, 0);
    await settle(failure('VERSION_CONFLICT'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/Lịch trình vừa được thành viên khác thay đổi/),
    ).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('blocks moving a fixed-time activity to another day and offers the detail editor', async () => {
    const { d2, update, drop } = await setup();
    const user = userEvent.setup();
    await drop('t1', d2, 0);
    expect(update).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Hoạt động có giờ cố định — sửa giờ trong chi tiết/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mở chi tiết' }));
    const dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
    expect(within(dialog).getByLabelText('Ngày bắt đầu hoặc ngày chưa có giờ')).toHaveValue(d2);
    expect(update).not.toHaveBeenCalled();
  });
});
