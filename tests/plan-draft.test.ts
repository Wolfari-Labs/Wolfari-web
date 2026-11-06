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
const editorTrip = {
  timezone,
  tripStartAt: '2026-09-21T17:00:00.000Z',
  tripEndAt: '2026-09-23T17:00:00.000Z',
};

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

  it.each([
    { label: 'head', index: 0, expected: [4, 0, 1, 2, 3] },
    { label: 'middle', index: 2, expected: [0, 1, 4, 2, 3] },
    { label: 'end', index: 4, expected: [0, 1, 2, 3, 4] },
  ])(
    'inserts a pool activity at the $label of the day and resets its suffix',
    async ({ index, expected }) => {
      const plan = await fixturePlan();
      const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
      const day = '2026-09-22';
      const before = draftActivitiesForDay(draft.activities, day);
      const poolActivity = unscheduledDraftActivities(draft.activities)[0]!;
      const moved = movePlanDraftActivity(
        draft,
        { activityId: poolActivity.id, target: { type: 'DAY', day, index } },
        1,
      );
      const after = draftActivitiesForDay(moved.activities, day);

      expect(after.map((activity) => activity.position)).toEqual([0, 1, 2, 3, 4]);
      expect(after.map((activity) => activity.id)).toEqual(
        expected.map((position) => (position === 4 ? poolActivity.id : before[position]!.id)),
      );
      expect(after.slice(0, index).map((activity) => [activity.startsAt, activity.endsAt])).toEqual(
        before.slice(0, index).map((activity) => [activity.startsAt, activity.endsAt]),
      );
      expect(after.slice(index).every((activity) => activity.scheduledDate === day)).toBe(true);
      expect(
        after
          .slice(index)
          .every((activity) => activity.startsAt === null && activity.endsAt === null),
      ).toBe(true);
      expect(unscheduledDraftActivities(moved.activities)).not.toContainEqual(
        expect.objectContaining({ id: poolActivity.id }),
      );
    },
  );

  it('moves a pool activity into an empty day without changing other day schedules', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const source = draftActivitiesForDay(draft.activities, '2026-09-22');
    const poolActivity = unscheduledDraftActivities(draft.activities)[0]!;
    const day = '2026-09-23';
    const moved = movePlanDraftActivity(
      draft,
      { activityId: poolActivity.id, target: { type: 'DAY', day, index: 0 } },
      1,
    );

    expect(draftActivitiesForDay(moved.activities, day)).toMatchObject([
      {
        id: poolActivity.id,
        scheduledDate: day,
        startsAt: null,
        endsAt: null,
        position: 0,
      },
    ]);
    expect(draftActivitiesForDay(moved.activities, '2026-09-22')).toEqual(source);
  });

  it.each([
    { label: 'up', from: 2, to: 0, expected: [2, 0, 1, 3] },
    { label: 'down', from: 0, to: 2, expected: [1, 2, 0, 3] },
  ])(
    'reorders a timed activity $label and clears times from its final position',
    async ({ from, to, expected }) => {
      const plan = await fixturePlan();
      const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
      const day = '2026-09-22';
      const before = draftActivitiesForDay(draft.activities, day);
      const moved = movePlanDraftActivity(
        draft,
        { activityId: before[from]!.id, target: { type: 'DAY', day, index: to } },
        1,
      );
      const after = draftActivitiesForDay(moved.activities, day);
      const byId = new Map(before.map((activity) => [activity.id, activity]));

      expect(after.map((activity) => activity.id)).toEqual(
        expected.map((index) => before[index]!.id),
      );
      expect(after.map((activity) => activity.position)).toEqual([0, 1, 2, 3]);
      expect(after.slice(0, to).map((activity) => [activity.startsAt, activity.endsAt])).toEqual(
        expected
          .slice(0, to)
          .map((index) => [
            byId.get(before[index]!.id)!.startsAt,
            byId.get(before[index]!.id)!.endsAt,
          ]),
      );
      expect(
        after.slice(to).every((activity) => activity.startsAt === null && activity.endsAt === null),
      ).toBe(true);
      expect(after.every((activity) => activity.scheduledDate === day)).toBe(true);
    },
  );

  it('keeps a repeated pool drop as a no-op and only clears the activity moved back to the pool', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const day = '2026-09-22';
    const source = draftActivitiesForDay(draft.activities, day);
    const originalPool = unscheduledDraftActivities(draft.activities);
    const timedBefore = source.map(({ id, startsAt, endsAt }) => ({ id, startsAt, endsAt }));
    const moved = movePlanDraftActivity(
      draft,
      { activityId: source[1]!.id, target: { type: 'POOL' } },
      1,
    );

    expect(
      movePlanDraftActivity(moved, { activityId: source[1]!.id, target: { type: 'POOL' } }),
    ).toBe(moved);
    expect(draftActivitiesForDay(moved.activities, day).map((activity) => activity.id)).toEqual([
      source[0]!.id,
      source[2]!.id,
      source[3]!.id,
    ]);
    expect(
      draftActivitiesForDay(moved.activities, day).map((activity) => activity.position),
    ).toEqual([0, 1, 2]);
    expect(unscheduledDraftActivities(moved.activities).map((activity) => activity.id)).toEqual([
      ...originalPool.map((activity) => activity.id),
      source[1]!.id,
    ]);
    expect(unscheduledDraftActivities(moved.activities).at(-1)?.position).toBe(originalPool.length);
    expect(
      unscheduledDraftActivities(moved.activities).find(
        (activity) => activity.id === source[1]!.id,
      ),
    ).toMatchObject({
      scheduledDate: null,
      startsAt: null,
      endsAt: null,
    });
    for (const activity of source.filter((activity) => activity.id !== source[1]!.id)) {
      const before = timedBefore.find((item) => item.id === activity.id)!;
      expect(moved.activities.find((item) => item.id === activity.id)).toMatchObject({
        scheduledDate: day,
        startsAt: before.startsAt,
        endsAt: before.endsAt,
      });
    }
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

  it('validates the editor title, date and time pair', () => {
    expect(
      validatePlanDraftEdit({
        ...editorTrip,
        title: ' ',
        day: '2026-09-22',
        startTime: '',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/bắt buộc/);
    expect(
      validatePlanDraftEdit({
        ...editorTrip,
        title: 'A',
        day: '2026-09-22',
        startTime: '09:00',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/cả giờ/);
    expect(
      validatePlanDraftEdit({
        ...editorTrip,
        title: 'A',
        day: '2026-09-22',
        startTime: '10:00',
        endTime: '09:00',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/phải sau/);
    expect(
      validatePlanDraftEdit({
        ...editorTrip,
        title: 'A',
        day: '2026-09-23',
        startTime: '',
        endTime: '',
        allowedDays: ['2026-09-22'],
      }),
    ).toMatch(/trong chuyến đi/);
  });

  it('preserves submitted times on the target day when the editor changes an activity date', async () => {
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
      startsAt: '2026-09-23T02:15:00.000Z',
      endsAt: '2026-09-23T03:30:00.000Z',
    });
    expect(edited.activities.find((activity) => activity.id === untouched.id)?.startsAt).toBe(
      untouched.startsAt,
    );
  });

  it('updates same-day times without moving the activity or changing other activities', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const source = draftActivitiesForDay(draft.activities, '2026-09-22')[1]!;
    const edited = editPlanDraftActivity(draft, {
      activityId: source.id,
      title: 'Tên mới',
      day: '2026-09-22',
      startTime: '09:15',
      endTime: '10:30',
      timezone,
    });
    expect(edited.activities.find((activity) => activity.id === source.id)).toMatchObject({
      title: 'Tên mới',
      scheduledDate: '2026-09-22',
      startsAt: '2026-09-22T02:15:00.000Z',
      endsAt: '2026-09-22T03:30:00.000Z',
      position: source.position,
    });
    expect(edited.activities.filter((activity) => activity.id !== source.id)).toEqual(
      draft.activities.filter((activity) => activity.id !== source.id),
    );
  });

  it('keeps the new date untimed when both submitted time fields are blank', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const source = draftActivitiesForDay(draft.activities, '2026-09-22')[0]!;
    expect(source.startsAt).not.toBeNull();
    const edited = editPlanDraftActivity(draft, {
      activityId: source.id,
      title: source.title,
      day: '2026-09-23',
      startTime: '',
      endTime: '',
      timezone,
    });
    expect(edited.activities.find((activity) => activity.id === source.id)).toMatchObject({
      scheduledDate: '2026-09-23',
      startsAt: null,
      endsAt: null,
    });
  });

  it('appends a changed-day edit after existing destination activities without resetting their times', async () => {
    const plan = await fixturePlan();
    const draft = createPlanDraft(plan, plan.selectedLocations, userId, timezone, 0);
    const sourceDay = draftActivitiesForDay(draft.activities, '2026-09-22');
    const source = sourceDay[0]!;
    const destination = {
      ...sourceDay[1]!,
      scheduledDate: '2026-09-23',
      startsAt: '2026-09-23T01:00:00.000Z',
      endsAt: '2026-09-23T02:00:00.000Z',
      position: 0,
    };
    const arranged = {
      ...draft,
      activities: draft.activities.map((activity) =>
        activity.id === destination.id ? destination : activity,
      ),
    };
    const edited = editPlanDraftActivity(arranged, {
      activityId: source.id,
      title: source.title,
      day: '2026-09-23',
      startTime: '09:15',
      endTime: '10:30',
      timezone,
    });
    const targetDay = draftActivitiesForDay(edited.activities, '2026-09-23');
    expect(targetDay.map((activity) => activity.id)).toEqual([destination.id, source.id]);
    expect(targetDay.map((activity) => activity.position)).toEqual([0, 1]);
    expect(targetDay[0]).toEqual(destination);
    expect(targetDay[1]).toMatchObject({
      startsAt: '2026-09-23T02:15:00.000Z',
      endsAt: '2026-09-23T03:30:00.000Z',
    });
    const remaining = draftActivitiesForDay(edited.activities, '2026-09-22');
    expect(remaining.map((activity) => activity.id)).toEqual(
      sourceDay.slice(2).map((item) => item.id),
    );
    expect(remaining.map((activity) => activity.position)).toEqual([0, 1]);
    for (const activity of arranged.activities.filter((item) => item.id !== source.id)) {
      expect(edited.activities.find((item) => item.id === activity.id)).toMatchObject({
        scheduledDate: activity.scheduledDate,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
      });
    }
  });

  it('rejects a DST-gap time on the target day without mutating the source draft', async () => {
    const plan = await fixturePlan();
    const timezone = 'America/New_York';
    const draft = createPlanDraft(
      {
        ...plan,
        activities: [
          {
            ...plan.activities[0]!,
            startsAt: '2026-03-07T07:30:00.000Z',
            endsAt: '2026-03-07T08:30:00.000Z',
          },
        ],
      },
      [],
      userId,
      timezone,
      0,
    );
    const source = draft.activities[0]!;
    const before = JSON.stringify(draft);
    expect(() =>
      editPlanDraftActivity(draft, {
        activityId: source.id,
        title: 'Invalid local time',
        day: '2026-03-08',
        startTime: '02:30',
        endTime: '03:30',
        timezone,
      }),
    ).toThrow();
    expect(JSON.stringify(draft)).toBe(before);
  });
});

describe('plan draft editor trip-time validation', () => {
  const partialDay = {
    title: 'A',
    day: '2026-09-22',
    allowedDays: ['2026-09-22'],
    timezone,
    tripStartAt: '2026-09-22T02:00:00.000Z',
    tripEndAt: '2026-09-22T10:00:00.000Z',
  };

  it.each([
    { startTime: '08:59', endTime: '10:00' },
    { startTime: '16:00', endTime: '17:01' },
  ])('rejects an allowed calendar day with out-of-trip instants: $startTime–$endTime', (times) => {
    expect(validatePlanDraftEdit({ ...partialDay, ...times })).not.toBeNull();
  });

  it('accepts timed activity instants exactly on the trip boundaries', () => {
    expect(
      validatePlanDraftEdit({ ...partialDay, startTime: '09:00', endTime: '17:00' }),
    ).toBeNull();
  });

  it('accepts a date-only activity on an allowed partially covered trip day', () => {
    expect(validatePlanDraftEdit({ ...partialDay, startTime: '', endTime: '' })).toBeNull();
  });

  it('rejects a local time that does not exist during a DST transition', () => {
    expect(
      validatePlanDraftEdit({
        title: 'A',
        day: '2026-03-08',
        startTime: '02:30',
        endTime: '03:30',
        allowedDays: ['2026-03-08'],
        timezone: 'America/New_York',
        tripStartAt: '2026-03-08T05:00:00.000Z',
        tripEndAt: '2026-03-09T04:00:00.000Z',
      }),
    ).not.toBeNull();
  });
});
