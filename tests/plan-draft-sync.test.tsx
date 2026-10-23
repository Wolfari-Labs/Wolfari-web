import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlanDraft } from '../src/features/plan/hooks/use-plan-draft';
import {
  createPlanDraft,
  editPlanDraftActivity,
  planDraftKey,
  type PlanDraftActivity,
} from '../src/features/plan/model/plan-draft';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

async function setup(userId: string) {
  const result = await createFixturePlanRepository().getPlan({
    tripId: previewTripId,
    scenario: 'success',
    signal: new AbortController().signal,
  });
  if (result.status !== 'ready') throw new Error('Missing fixture');
  const plan = result.data;
  const props = {
    userId,
    tripId: previewTripId,
    plan,
    locations: plan.selectedLocations,
    timezone: 'Asia/Ho_Chi_Minh',
  };
  return {
    props,
    key: planDraftKey(userId, previewTripId),
    draft: createPlanDraft(plan, plan.selectedLocations, userId, props.timezone),
  };
}

const edit = (activity: PlanDraftActivity, title: string) => ({
  activityId: activity.id,
  title,
  day: activity.scheduledDate!,
  startTime: '',
  endTime: '',
  timezone: 'Asia/Ho_Chi_Minh',
});

describe('Plan draft synchronization', () => {
  it('blocks an open editor and moves after permission is revoked without a version change', async () => {
    const { props, key, draft } = await setup('permission-downgrade-reader');
    const raw = JSON.stringify(draft);
    localStorage.setItem(key, raw);
    const { result, rerender } = renderHook((input) => usePlanDraft(input), { initialProps: props });
    const opened = result.current.activities[0]!;
    rerender({ ...props, plan: { ...props.plan, permissions: { ...props.plan.permissions, canEdit: false } } });
    await act(async () => {
      expect(await result.current.edit(edit(opened, 'Forbidden local edit'), opened)).toBe(false);
      result.current.move({ activityId: opened.id, target: { type: 'POOL' } });
    });
    expect(result.current.needsReview).toBe(false);
    expect(localStorage.getItem(key)).toBe(raw);
    expect(result.current.activities[0]).toEqual(opened);
    await act(async () => {
      expect(await result.current.resetToServer()).toBe(true);
    });
  });

  it('preserves draft on a newer server snapshot and blocks writes until an explicit reset', async () => {
    const { props, key, draft } = await setup('server-conflict-reader');
    const pending = editPlanDraftActivity(draft, edit(draft.activities[0]!, 'Unsaved intent'));
    const raw = JSON.stringify(pending);
    localStorage.setItem(key, raw);
    const { result, rerender } = renderHook((input) => usePlanDraft(input), {
      initialProps: props,
    });
    expect(result.current.needsReview).toBe(false);
    const newer = { ...props, plan: { ...props.plan, planVersion: props.plan.planVersion + 1 } };
    rerender(newer);
    expect(result.current.needsReview).toBe(true);
    expect(result.current.activities[0]!.title).toBe('Unsaved intent');
    expect(localStorage.getItem(key)).toBe(raw);
    const stale = result.current.activities[0]!;
    await act(async () => {
      expect(await result.current.edit(edit(stale, 'Blocked edit'), stale)).toBe(false);
      result.current.move({ activityId: stale.id, target: { type: 'POOL' } });
    });
    expect(localStorage.getItem(key)).toBe(raw);
    await act(async () => {
      expect(await result.current.resetToServer()).toBe(true);
    });
    expect(result.current.needsReview).toBe(false);
    expect(result.current.activities[0]!.title).toBe(draft.activities[0]!.title);
    expect(JSON.parse(localStorage.getItem(key)!).basePlanVersion).toBe(newer.plan.planVersion);
  });

  it('reads the latest snapshot before editing a different activity, even before a storage event', async () => {
    const { props, key, draft } = await setup('latest-reader');
    const { result } = renderHook(() => usePlanDraft(props));
    const first = result.current.activities[0]!;
    const second = result.current.activities[1]!;
    const remote = editPlanDraftActivity(draft, edit(first, 'Remote first'));
    localStorage.setItem(key, JSON.stringify(remote));
    await act(async () => {
      expect(await result.current.edit(edit(second, 'Local second'), second)).toBe(true);
    });
    expect(result.current.activities[0]!.title).toBe('Remote first');
    expect(result.current.activities[1]!.title).toBe('Local second');
  });

  it('rejects stale edits to the same activity without writing over the new snapshot', async () => {
    const { props, key, draft } = await setup('conflict-reader');
    const { result } = renderHook(() => usePlanDraft(props));
    const first = result.current.activities[0]!;
    const remote = JSON.stringify(editPlanDraftActivity(draft, edit(first, 'Remote winner')));
    localStorage.setItem(key, remote);
    await act(async () => {
      expect(await result.current.edit(edit(first, 'Stale local edit'), first)).toBe(false);
    });
    expect(localStorage.getItem(key)).toBe(remote);
    expect(result.current.activities[0]!.title).toBe('Remote winner');
  });

  it.each([false, true])(
    'accepts storage snapshots and deletion without write-back (clear=%s)',
    async (clear) => {
      const { props, key, draft } = await setup(`event-reader-${clear}`);
      const { result, unmount } = renderHook(() => usePlanDraft(props));
      const remote = JSON.stringify(
        editPlanDraftActivity(draft, edit(draft.activities[0]!, 'Remote event')),
      );
      localStorage.setItem(key, remote);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      act(() =>
        window.dispatchEvent(
          new StorageEvent('storage', { key, newValue: remote, storageArea: localStorage }),
        ),
      );
      expect(result.current.activities[0]!.title).toBe('Remote event');
      if (clear) localStorage.clear();
      else localStorage.removeItem(key);
      act(() =>
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: clear ? null : key,
            newValue: null,
            storageArea: localStorage,
          }),
        ),
      );
      expect(result.current.activities[0]!.title).toBe(draft.activities[0]!.title);
      expect(writes).not.toHaveBeenCalled();
      unmount();
      renderHook(() => usePlanDraft(props));
      expect(localStorage.getItem(key)).toBeNull();
      expect(writes).not.toHaveBeenCalled();
    },
  );

  it('retains successive edits and reports memory-only after quota failure', async () => {
    const { props } = await setup('quota-reader');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    const { result, unmount } = renderHook(() => usePlanDraft(props));
    const first = result.current.activities[0]!;
    await act(async () => {
      await result.current.edit(edit(first, 'Memory edit'), first);
    });
    expect(result.current.storageStatus).toBe('memory');
    expect(result.current.activities[0]!.title).toBe('Memory edit');
    unmount();
    const remount = renderHook(() => usePlanDraft(props));
    expect(remount.result.current.activities[0]!.title).toBe('Memory edit');
    expect(remount.result.current.storageStatus).toBe('memory');
  });

  it('does not restore scheduled activities from old synthetic fallback locations', async () => {
    const { props, key, draft } = await setup('legacy-fallback-reader');
    const fake = {
      ...draft.activities[0]!,
      id: 'draft:fallback:cho-han',
      selectedLocationId: 'fallback:cho-han',
      origin: 'LOCATION',
      clientOnly: true,
    };
    localStorage.setItem(
      key,
      JSON.stringify({ ...draft, activities: [...draft.activities, fake] }),
    );
    const { result } = renderHook(() => usePlanDraft(props));
    expect(result.current.activities.some((activity) => activity.id === fake.id)).toBe(false);
    expect(result.current.activities).toHaveLength(draft.activities.length);
  });
});
