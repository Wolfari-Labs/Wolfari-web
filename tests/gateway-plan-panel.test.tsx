import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '../src/app/providers';
import { GatewayPlanPanel } from '../src/features/plan/components/GatewayPlanPanel';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import type {
  PlanCommandResult,
  PlanRepository,
  PlanViewModel,
} from '../src/features/plan/model/plan';

async function setup(options: { member?: boolean; archived?: boolean } = {}) {
  const tripRepository = createFixtureTripRepository();
  const planRepository = createFixturePlanRepository();
  const input = {
    tripId: previewTripId,
    scenario: 'success' as const,
    signal: new AbortController().signal,
  };
  const [p, t] = await Promise.all([planRepository.getPlan(input), tripRepository.getTrip(input)]);
  if (p.status !== 'ready' || t.status !== 'ready') throw Error('fixture missing');
  const trip = { ...t.data, archivedAt: options.archived ? '2026-01-01T00:00:00Z' : null };
  const base = p.data.activities[0]!;
  const plan: PlanViewModel = {
    ...p.data,
    permissions: { canRead: true, canEdit: !options.member, canComplete: true },
    activities: [
      { ...base, id: 'todo', title: 'Todo activity', position: 0, startsAt: null, endsAt: null },
      {
        ...base,
        id: 'mine',
        title: 'My completed',
        position: 1,
        status: 'COMPLETED',
        completedByUserId: trip.currentMembership.userId,
      },
      {
        ...base,
        id: 'theirs',
        title: 'Their completed',
        position: 2,
        status: 'COMPLETED',
        completedByUserId: 'other-user',
      },
    ],
  };
  const success = { status: 'success' as const, data: base, correlationId: null };
  const create = vi.fn<NonNullable<PlanRepository['createActivity']>>().mockResolvedValue(success);
  const update = vi.fn<NonNullable<PlanRepository['updateActivity']>>().mockResolvedValue(success);
  const complete = vi
    .fn<NonNullable<PlanRepository['setActivityCompletion']>>()
    .mockResolvedValue(success);
  const remove = vi.fn<NonNullable<PlanRepository['deleteActivity']>>().mockResolvedValue({
    status: 'success',
    data: { planVersion: 2, exportRevision: 2 },
    correlationId: null,
  });
  const reorder = vi.fn<NonNullable<PlanRepository['reorderActivities']>>().mockResolvedValue({
    status: 'success',
    data: { planVersion: 2, exportRevision: 2 },
    correlationId: null,
  });
  const repo = {
    ...planRepository,
    createActivity: create,
    updateActivity: update,
    setActivityCompletion: complete,
    deleteActivity: remove,
    reorderActivities: reorder,
  };
  const refresh = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const busy = vi.fn();
  const view = (value = plan) => (
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={tripRepository}
      planRepository={repo}
    >
      <GatewayPlanPanel trip={trip} plan={value} refresh={refresh} onBusyChange={busy} />
    </Providers>
  );
  const rendered = render(view());
  return {
    user: userEvent.setup(),
    plan,
    trip,
    create,
    update,
    complete,
    remove,
    reorder,
    refresh,
    busy,
    rerender: (value: PlanViewModel) => rendered.rerender(view(value)),
  };
}
const item = (title: string) => within(screen.getByRole('listitem', { name: title }));
const add = () => screen.getByRole('button', { name: 'Tạo hoạt động trên server' });
const save = () => screen.getByRole('button', { name: 'Lưu trên server' });

describe('Gateway Plan controls', () => {
  it('reconciles an unknown create and retries the exact intent before closing the form', async () => {
    const { user, create, refresh, plan } = await setup();
    create.mockResolvedValueOnce({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE', retryable: true, correlationId: 'unknown-create' },
    });
    create.mockResolvedValueOnce({
      status: 'success',
      data: plan.activities[0]!,
      correlationId: 'confirmed',
    });
    await user.click(add());
    await user.type(screen.getByLabelText('Tên hoạt động'), 'Uncertain stop');
    await user.click(save());
    expect(create).toHaveBeenCalledTimes(1);
    const original = create.mock.calls[0]![0];
    expect(save()).toBeDisabled();
    expect(screen.getByLabelText('Tên hoạt động')).toHaveValue('Uncertain stop');
    const retry = screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' });
    expect(retry).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tải lại để đối chiếu' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(retry).toBeEnabled();
    expect(save()).toBeDisabled();
    await user.click(retry);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1]![0]).toMatchObject({
      tripId: original.tripId,
      activity: original.activity,
      expectedPlanVersion: original.expectedPlanVersion,
      idempotencyKey: original.idempotencyKey,
    });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(add()).toBeEnabled();
  });
  it('allows members to complete and reopen only their own completion', async () => {
    const { user, complete } = await setup({ member: true });
    expect(
      screen.queryByRole('button', { name: 'Tạo hoạt động trên server' }),
    ).not.toBeInTheDocument();
    expect(
      item('Their completed').queryByRole('button', { name: 'Mở lại' }),
    ).not.toBeInTheDocument();
    await user.click(item('Todo activity').getByRole('button', { name: 'Hoàn tất' }));
    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith(
        expect.objectContaining({ activityId: 'todo', status: 'COMPLETED' }),
      ),
    );
    await user.click(item('My completed').getByRole('button', { name: 'Mở lại' }));
    expect(complete).toHaveBeenLastCalledWith(
      expect.objectContaining({ activityId: 'mine', status: 'TODO' }),
    );
  });
  it('makes archived trips read only even when snapshot permissions allow commands', async () => {
    await setup({ archived: true });
    expect(screen.queryByRole('button', { name: 'Hoàn tất' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa trên server' })).not.toBeInTheDocument();
  });
  it('blocks empty create and preserves form input', async () => {
    const { user, create } = await setup();
    await user.click(add());
    await user.click(save());
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole('form', { name: 'Tạo hoạt động trên server' })).toBeInTheDocument();
  });
  it('rejects a date without both times instead of inventing timestamps', async () => {
    const { user, create } = await setup();
    await user.click(add());
    await user.type(screen.getByLabelText('Tên hoạt động'), 'Lunch');
    fireEvent.change(screen.getByLabelText('Ngày có giờ trên server'), {
      target: { value: '2026-10-01' },
    });
    await user.click(save());
    expect(create).not.toHaveBeenCalled();
  });
  it('creates unscheduled activities and offers only server selected locations', async () => {
    const { user, create, plan, refresh } = await setup();
    await user.click(add());
    const select = screen.getByRole('combobox');
    expect(within(select).getAllByRole('option')).toHaveLength(plan.selectedLocations.length + 1);
    await user.type(screen.getByLabelText('Tên hoạt động'), 'New stop');
    await user.selectOptions(select, plan.selectedLocations[0]!.id);
    await user.click(save());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({
          title: 'New stop',
          startsAt: null,
          endsAt: null,
          selectedLocationId: plan.selectedLocations[0]!.id,
          position: 3,
        }),
      }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
  it('blocks invalid edited title without sending a PATCH', async () => {
    const { user, update } = await setup();
    await user.click(item('Todo activity').getByRole('button', { name: 'Sửa trên server' }));
    await user.clear(screen.getByLabelText('Tên hoạt động'));
    await user.click(save());
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ngày có giờ trên server')).toBeDisabled();
  });
  it('requires explicit delete confirmation and supports cancellation', async () => {
    const { user, remove } = await setup();
    await user.click(item('Todo activity').getByRole('button', { name: 'Xóa trên server' }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hủy xóa' }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(item('Todo activity').getByRole('button', { name: 'Xóa trên server' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa trên server' }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 'todo', expectedPlanVersion: 1 }),
    );
  });
  it('submits a complete reorder permutation and prevents boundary movement', async () => {
    const { user, reorder } = await setup();
    expect(item('Todo activity').getByRole('button', { name: 'Đưa lên' })).toBeDisabled();
    await user.click(item('Todo activity').getByRole('button', { name: 'Đưa xuống' }));
    expect(reorder).toHaveBeenCalledWith(
      expect.objectContaining({ activityIds: ['mine', 'todo', 'theirs'] }),
    );
  });
  it('locks all actions while an operation is pending and prevents duplicate submits', async () => {
    const { user, create } = await setup();
    let resolve!: (result: PlanCommandResult<never>) => void;
    create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await user.click(add());
    await user.type(screen.getByLabelText('Tên hoạt động'), 'Pending');
    await user.dblClick(save());
    expect(create).toHaveBeenCalledTimes(1);
    expect(save()).toBeDisabled();
    await act(async () =>
      resolve({
        status: 'error',
        error: { code: 'VALIDATION_FAILED', retryable: false, correlationId: null },
      }),
    );
    expect(save()).toBeEnabled();
  });
  it('retains edited content on conflict and requires reconciliation before resubmission', async () => {
    const { user, update, refresh, plan, rerender } = await setup();
    update.mockResolvedValue({
      status: 'error',
      error: { code: 'VERSION_CONFLICT', retryable: false, correlationId: 'conflict-trace' },
    });
    await user.click(item('Todo activity').getByRole('button', { name: 'Sửa trên server' }));
    await user.clear(screen.getByLabelText('Tên hoạt động'));
    await user.type(screen.getByLabelText('Tên hoạt động'), 'Keep my edit');
    await user.click(save());
    expect(screen.getByLabelText('Tên hoạt động')).toHaveValue('Keep my edit');
    expect(save()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tải lại để đối chiếu' }));
    expect(refresh).toHaveBeenCalled();
    rerender({ ...plan, planVersion: 2 });
    expect(save()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Đã đối chiếu, giữ nội dung nhập' }));
    expect(save()).toBeEnabled();
    expect(screen.getByLabelText('Tên hoạt động')).toHaveValue('Keep my edit');
  });
});
