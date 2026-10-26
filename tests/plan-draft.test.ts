import { describe, expect, it } from 'vitest';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import type { PlanViewModel, SelectedLocationViewModel } from '../src/features/plan/model/plan';
import {
  PLAN_DRAFT_TTL_MS,
  createPlanDraft,
  draftActivitiesForDay,
  editPlanDraftActivity,
  movePlanDraftActivity,
  parsePlanDraft,
  reconcilePlanDraft,
  unscheduledDraftActivities,
  validatePlanDraftEdit,
} from '../src/features/plan/model/plan-draft';

const timezone = 'Asia/Ho_Chi_Minh';
const userId = 'user-local';

async function fixturePlan() {
  const result = await createFixturePlanRepository().getPlan({
    tripId: previewTripId,
    scenario: 'success',
    signal: new AbortController().signal,
  });
  if (result.status !== 'ready') throw new Error('Missing fixture plan');
  return result.data;
}

function localLocation(
  overrides: Partial<SelectedLocationViewModel> = {},
): SelectedLocationViewModel {
  return {
    id: 'local-location',
    tripId: previewTripId,
    name: 'Quán cà phê ven biển',
    address: 'Đà Nẵng',
    latitude: '16.06',
    longitude: '108.22',
    provider: 'google',
    providerPlaceId: 'google-place',
    source: 'PROVIDER',
    openingHours: null,
    fetchedAt: '2026-10-20T00:00:00.000Z',
    metadata: { types: ['cafe'] },
    planVersion: 1,
    ...overrides,
  };
}

describe('plan draft persistence and reconciliation', () => {
  it('rejects malformed and expired payloads and accepts a valid 30-day payload', async () => {
    const plan = await fixturePlan();
    const now = Date.parse('2026-10-21T00:00:00.000Z');
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, now);
    expect(parsePlanDraft('{bad json', now)).toBeNull();
    expect(parsePlanDraft(JSON.stringify({ ...draft, version: 2 }), now)).toBeNull();
    expect(parsePlanDraft(JSON.stringify(draft), now)).toEqual(draft);
    expect(Date.parse(draft.expiresAt) - now).toBe(PLAN_DRAFT_TTL_MS);
    expect(parsePlanDraft(JSON.stringify(draft), now + PLAN_DRAFT_TTL_MS)).toBeNull();
  });

  it('creates one typed draft per selected location and removes only an unscheduled client draft', () => {
    const location = localLocation();
    const plan: PlanViewModel = {
      tripId: previewTripId,
      planVersion: 1,
      exportRevision: 1,
      activities: [],
      selectedLocations: [location],
      dressCodes: [],
      packingItems: [],
      permissions: { canRead: true, canEdit: true, canComplete: true },
    };
    const created = createPlanDraft(plan, [location, location], userId, timezone, 0);
    expect(created.activities).toHaveLength(1);
    expect(created.activities[0]).toMatchObject({
      id: 'draft:local-location',
      activityType: 'MEAL',
      scheduledDate: null,
      clientOnly: true,
    });
    expect(reconcilePlanDraft(created, plan, [], userId, timezone, 1).activities).toEqual([]);

    const scheduled = movePlanDraftActivity(created, {
      activityId: 'draft:local-location',
      target: { type: 'DAY', day: '2026-09-22', index: 0 },
    });
    expect(reconcilePlanDraft(scheduled, plan, [], userId, timezone, 2).activities).toHaveLength(1);
  });

  it('preserves unsaved schedule and its base version when the server version changes', () => {
    const location = localLocation();
    const oldPlan: PlanViewModel = {
      tripId: previewTripId,
      planVersion: 1,
      exportRevision: 1,
      activities: [],
      selectedLocations: [location],
      dressCodes: [],
      packingItems: [],
      permissions: { canRead: true, canEdit: true, canComplete: true },
    };
    const stored = movePlanDraftActivity(
      createPlanDraft(oldPlan, [location], userId, timezone, 0),
      { activityId: 'draft:local-location', target: { type: 'DAY', day: '2026-09-22', index: 0 } },
      1,
    );
    const current = { ...oldPlan, planVersion: 2 };
    const reconciled = reconcilePlanDraft(stored, current, [location], userId, timezone, 2);
    expect(reconciled).toBe(stored);
    expect(reconciled.basePlanVersion).toBe(1);
    expect(reconciled.activities[0]).toMatchObject({
      selectedLocationId: location.id,
      scheduledDate: '2026-09-22',
      startsAt: null,
      endsAt: null,
    });
  });
});

describe('plan draft movement and editing', () => {
  it('does not clear times or change the draft when dropped into the same slot', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone);
    const activity = draftActivitiesForDay(draft.activities, '2026-09-22')[1]!;
    expect(
      movePlanDraftActivity(draft, {
        activityId: activity.id,
        target: { type: 'DAY', day: '2026-09-22', index: activity.position },
      }),
    ).toBe(draft);
  });
  it('moves pool → timeline and resets the dropped activity plus the full suffix', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const poolActivity = unscheduledDraftActivities(draft.activities)[0]!;
    const day = '2026-09-22';
    const before = draftActivitiesForDay(draft.activities, day);
    const moved = movePlanDraftActivity(
      draft,
      {
        activityId: poolActivity.id,
        target: { type: 'DAY', day, index: 2 },
      },
      1,
    );
    const after = draftActivitiesForDay(moved.activities, day);
    expect(after.map((activity) => activity.id)).toEqual([
      before[0]!.id,
      before[1]!.id,
      poolActivity.id,
      before[2]!.id,
      before[3]!.id,
    ]);
    expect(after.slice(0, 2).every((activity) => activity.startsAt !== null)).toBe(true);
    expect(
      after.slice(2).every((activity) => activity.startsAt === null && activity.endsAt === null),
    ).toBe(true);
    expect(after.slice(2).every((activity) => activity.scheduledDate === day)).toBe(true);
  });

  it('reorders within a day, resets from the final dragged position and moves timeline → pool without changing remaining times', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const day = '2026-09-22';
    const before = draftActivitiesForDay(draft.activities, day);
    const reordered = movePlanDraftActivity(
      draft,
      {
        activityId: before[0]!.id,
        target: { type: 'DAY', day, index: 2 },
      },
      1,
    );
    const dayItems = draftActivitiesForDay(reordered.activities, day);
    expect(dayItems.map((activity) => activity.id)).toEqual([
      before[1]!.id,
      before[2]!.id,
      before[0]!.id,
      before[3]!.id,
    ]);
    expect(dayItems.slice(0, 2).every((activity) => activity.startsAt !== null)).toBe(true);
    expect(dayItems.slice(2).every((activity) => activity.startsAt === null)).toBe(true);

    const removed = movePlanDraftActivity(
      draft,
      {
        activityId: before[1]!.id,
        target: { type: 'POOL' },
      },
      2,
    );
    const remaining = draftActivitiesForDay(removed.activities, day);
    expect(remaining).toHaveLength(before.length - 1);
    expect(
      remaining.every((activity) => activity.startsAt !== null && activity.endsAt !== null),
    ).toBe(true);
    expect(unscheduledDraftActivities(removed.activities).at(-1)).toMatchObject({
      id: before[1]!.id,
      scheduledDate: null,
      startsAt: null,
      endsAt: null,
    });
    expect(movePlanDraftActivity(draft, { activityId: 'missing', target: { type: 'POOL' } })).toBe(
      draft,
    );
  });

  it('reindexes both days and preserves the moved order after reconciliation', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const dayOne = '2026-09-22';
    const dayTwo = '2026-09-23';
    const source = draftActivitiesForDay(draft.activities, dayOne);
    const moved = movePlanDraftActivity(
      draft,
      {
        activityId: source[1]!.id,
        target: { type: 'DAY', day: dayTwo, index: 0 },
      },
      1,
    );

    expect(
      draftActivitiesForDay(moved.activities, dayOne).map((activity) => activity.position),
    ).toEqual([0, 1, 2]);
    expect(draftActivitiesForDay(moved.activities, dayTwo)).toMatchObject([
      { id: source[1]!.id, position: 0, scheduledDate: dayTwo, startsAt: null, endsAt: null },
    ]);

    const rehydrated = reconcilePlanDraft(moved, plan, plan.selectedLocations, userId, timezone, 2);
    expect(
      draftActivitiesForDay(rehydrated.activities, dayTwo).map((activity) => activity.id),
    ).toEqual([source[1]!.id]);
    expect(
      draftActivitiesForDay(rehydrated.activities, dayOne).map((activity) => activity.id),
    ).toEqual([source[0]!.id, source[2]!.id, source[3]!.id]);
  });

  it('inserts a timeline activity at an explicit pool position', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const day = '2026-09-22';
    const source = draftActivitiesForDay(draft.activities, day)[1]!;
    const moved = movePlanDraftActivity(
      draft,
      {
        activityId: source.id,
        target: { type: 'POOL', index: 0 },
      },
      1,
    );

    expect(unscheduledDraftActivities(moved.activities)[0]).toMatchObject({
      id: source.id,
      scheduledDate: null,
      startsAt: null,
      endsAt: null,
      position: 0,
    });
  });

  it('validates the editor and clears moved activity times on day change, preserving other times', async () => {
    expect(
      validatePlanDraftEdit({
        title: ' ',
        day: '2026-09-22',
        startTime: '',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/bắt buộc/);
    expect(
      validatePlanDraftEdit({
        title: 'A',
        day: '2026-09-22',
        startTime: '09:00',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/cả giờ/);
    expect(
      validatePlanDraftEdit({
        title: 'A',
        day: '2026-09-22',
        startTime: '10:00',
        endTime: '09:00',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/phải sau/);
    expect(
      validatePlanDraftEdit({
        title: 'A',
        day: '2026-09-23',
        startTime: '',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/trong chuyến đi/);

    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const source = draftActivitiesForDay(draft.activities, '2026-09-22')[0]!;
    const untouched = draft.activities.find(
      (activity) => activity.id !== source.id && activity.startsAt,
    )!;
    const edited = editPlanDraftActivity(
      draft,
      {
        activityId: source.id,
        title: '  Tên mới  ',
        day: '2026-09-23',
        startTime: '09:15',
        endTime: '10:30',
        timezone,
      },
      1,
    );
    expect(edited.activities.find((activity) => activity.id === source.id)).toMatchObject({
      title: 'Tên mới',
      scheduledDate: '2026-09-23',
      startsAt: null,
      endsAt: null,
    });
    expect(edited.activities.find((activity) => activity.id === untouched.id)?.startsAt).toBe(
      untouched.startsAt,
    );
    const timed = editPlanDraftActivity(edited, {
      activityId: source.id,
      title: 'Tên mới',
      day: '2026-09-23',
      startTime: '09:15',
      endTime: '10:30',
      timezone,
    });
    expect(timed.activities.find((activity) => activity.id === source.id)).toMatchObject({
      startsAt: '2026-09-23T02:15:00.000Z',
      endsAt: '2026-09-23T03:30:00.000Z',
    });
  });
});
