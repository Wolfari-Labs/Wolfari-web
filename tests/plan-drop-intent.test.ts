import { describe, expect, it } from 'vitest';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import {
  createPlanDraft,
  draftActivitiesForDay,
  unscheduledDraftActivities,
} from '../src/features/plan/model/plan-draft';
import {
  isPreviewDropNoop,
  previewContainerItems,
  previewDropIntent,
  previewDropIntentFromBoundary,
  previewInsertionIndex,
} from '../src/features/plan/model/plan-drop-intent';

const timezone = 'Asia/Ho_Chi_Minh';
const day = '2026-09-22';

async function fixtureDraft() {
  const result = await createFixturePlanRepository().getPlan({
    tripId: previewTripId,
    scenario: 'success',
    signal: new AbortController().signal,
  });
  if (result.status !== 'ready') throw new Error('Missing fixture plan');
  return createPlanDraft(
    result.data,
    result.data.selectedLocations,
    'drop-intent-test',
    timezone,
    0,
  );
}

describe('preview drop intent boundaries', () => {
  it('converts same-list boundaries below and before the third item after removing the source', async () => {
    const draft = await fixtureDraft();
    const items = draftActivitiesForDay(draft.activities, day);
    const source = items[0]!;

    expect(previewInsertionIndex(0, 3)).toBe(2);
    expect(previewInsertionIndex(0, 2)).toBe(1);

    const belowThird = previewDropIntent(draft.activities, day, source.id, 'DAY', 2);
    expect(belowThird).toMatchObject({
      activityId: source.id,
      container: 'DAY',
      index: 2,
      beforeId: items[3]!.id,
      afterId: items[2]!.id,
    });

    const beforeThird = previewDropIntent(draft.activities, day, source.id, 'DAY', 1);
    expect(beforeThird).toMatchObject({
      activityId: source.id,
      container: 'DAY',
      index: 1,
      beforeId: items[2]!.id,
      afterId: items[1]!.id,
    });
  });

  it('converts reverse and upward moves to post-removal slots with correct markers', async () => {
    const draft = await fixtureDraft();
    const items = draftActivitiesForDay(draft.activities, day);
    const source = items[2]!;

    const toHead = previewDropIntent(
      draft.activities,
      day,
      source.id,
      'DAY',
      previewInsertionIndex(2, 0),
    );
    expect(toHead).toMatchObject({ index: 0, beforeId: items[0]!.id, afterId: null });

    const beforeSecond = previewDropIntent(
      draft.activities,
      day,
      source.id,
      'DAY',
      previewInsertionIndex(2, 1),
    );
    expect(beforeSecond).toMatchObject({ index: 1, beforeId: items[1]!.id, afterId: items[0]!.id });
  });

  it('resolves a visible filtered-pool boundary against the complete pool order', async () => {
    const draft = await fixtureDraft();
    const pool = previewContainerItems(draft.activities, day, 'POOL');
    const source = draftActivitiesForDay(draft.activities, day)[0]!;
    const visible = pool[0]!;

    const afterVisible = previewDropIntentFromBoundary(
      draft.activities,
      day,
      source.id,
      'POOL',
      { beforeId: null, afterId: visible.id },
    );
    expect(afterVisible).toMatchObject({
      index: 1,
      beforeId: pool[1]!.id,
      afterId: visible.id,
    });

    const beforeVisible = previewDropIntentFromBoundary(
      draft.activities,
      day,
      source.id,
      'POOL',
      { beforeId: visible.id, afterId: null },
    );
    expect(beforeVisible).toMatchObject({ index: 0, beforeId: visible.id, afterId: null });
  });

  it('marks dropping immediately before or after itself as a no-op', async () => {
    const draft = await fixtureDraft();
    const items = draftActivitiesForDay(draft.activities, day);
    const source = items[1]!;

    const beforeSelf = previewDropIntent(
      draft.activities,
      day,
      source.id,
      'DAY',
      previewInsertionIndex(1, 1),
    )!;
    const afterSelf = previewDropIntent(
      draft.activities,
      day,
      source.id,
      'DAY',
      previewInsertionIndex(1, 2),
    )!;

    expect(beforeSelf).toMatchObject({ index: 1, beforeId: items[2]!.id, afterId: items[0]!.id });
    expect(afterSelf).toEqual(beforeSelf);
    expect(isPreviewDropNoop(draft.activities, day, beforeSelf)).toBe(true);
    expect(isPreviewDropNoop(draft.activities, day, afterSelf)).toBe(true);
  });

  it('does not remove a day activity from the pool when calculating a cross-container drop', async () => {
    const draft = await fixtureDraft();
    const items = draftActivitiesForDay(draft.activities, day);
    const pool = unscheduledDraftActivities(draft.activities);
    const source = items[0]!;

    expect(previewContainerItems(draft.activities, day, 'POOL').map((item) => item.id)).toEqual(
      pool.map((item) => item.id),
    );
    expect(previewDropIntent(draft.activities, day, source.id, 'POOL', 0)).toMatchObject({
      container: 'POOL',
      index: 0,
      beforeId: pool[0]!.id,
      afterId: null,
    });
  });

  it('clamps out-of-range slots, handles empty containers, and rejects missing/nonfinite input', async () => {
    const draft = await fixtureDraft();
    const pool = unscheduledDraftActivities(draft.activities);
    const source = pool[0]!;

    expect(previewDropIntent(draft.activities, day, source.id, 'DAY', -10)).toMatchObject({
      index: 0,
      beforeId: draftActivitiesForDay(draft.activities, day)[0]!.id,
      afterId: null,
    });
    expect(previewDropIntent(draft.activities, day, source.id, 'DAY', 999)).toMatchObject({
      index: 4,
      beforeId: null,
      afterId: draftActivitiesForDay(draft.activities, day)[3]!.id,
    });
    expect(previewDropIntent(draft.activities, '2026-09-23', source.id, 'DAY', 0)).toMatchObject({
      index: 0,
      beforeId: null,
      afterId: null,
    });
    expect(previewDropIntent(draft.activities, day, 'missing', 'DAY', 0)).toBeNull();
    expect(previewDropIntent(draft.activities, day, source.id, 'DAY', Number.NaN)).toBeNull();
    expect(
      previewDropIntent(draft.activities, day, source.id, 'DAY', Number.POSITIVE_INFINITY),
    ).toBeNull();
    expect(previewDropIntent([], day, source.id, 'DAY', 0)).toBeNull();
  });
});
