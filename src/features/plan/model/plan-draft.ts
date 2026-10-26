import type { ActivityViewModel, PlanViewModel, SelectedLocationViewModel } from './plan';
import { localDate } from './plan-presentation';

export const PLAN_DRAFT_VERSION = 1;
export const PLAN_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PREFIX = 'wolfari:plan-draft:v1:';

export interface PlanDraftActivity extends ActivityViewModel {
  readonly scheduledDate: string | null;
  readonly origin: 'PLAN' | 'LOCATION';
  readonly clientOnly: boolean;
}

export interface PlanDraftPayloadV1 {
  readonly version: 1;
  readonly basePlanVersion: number;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly activities: readonly PlanDraftActivity[];
}

export interface PlanDraftState {
  readonly payload: PlanDraftPayloadV1;
  readonly storageStatus: 'saved' | 'memory';
}

export type PlanDraftMove = {
  readonly activityId: string;
  readonly target:
    | { readonly type: 'POOL'; readonly index?: number }
    | { readonly type: 'DAY'; readonly day: string; readonly index: number };
};

export type PlanDraftEdit = {
  readonly activityId: string;
  readonly title: string;
  readonly day: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
};

export function planDraftKey(userId: string, tripId: string) {
  return `${PREFIX}${userId}:${tripId}`;
}

function activityType(location: SelectedLocationViewModel) {
  const category =
    typeof (location as SelectedLocationViewModel & { category?: unknown }).category === 'string'
      ? (location as SelectedLocationViewModel & { category: string }).category
      : Array.isArray(location.metadata.types)
        ? location.metadata.types.find((value): value is string => typeof value === 'string')
        : null;
  if (category === 'restaurant' || category === 'cafe' || category === 'meal_takeaway')
    return 'MEAL';
  if (category === 'beach') return 'BEACH';
  if (category === 'park' || category === 'hiking_area') return 'WALK';
  return 'SIGHTSEEING';
}

function fromActivity(activity: ActivityViewModel, timezone: string): PlanDraftActivity {
  return {
    ...activity,
    scheduledDate: activity.startsAt ? localDate(activity.startsAt, timezone) : null,
    origin: 'PLAN',
    clientOnly: false,
  };
}

function fromLocation(
  location: SelectedLocationViewModel,
  plan: PlanViewModel,
  userId: string,
  order: number,
): PlanDraftActivity {
  return {
    id: `draft:${location.id}`,
    tripId: location.tripId,
    title: location.name,
    description: location.address,
    publicDescription: null,
    activityType: activityType(location),
    selectedLocationId: location.id,
    startsAt: null,
    endsAt: null,
    position: order,
    status: 'TODO',
    source: location.source,
    planVersion: plan.planVersion,
    createdByUserId: userId,
    completedByUserId: null,
    completedAt: null,
    presentation: { cover: null },
    scheduledDate: null,
    origin: 'LOCATION',
    clientOnly: true,
  };
}

function validActivity(value: unknown): value is PlanDraftActivity {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.tripId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.activityType === 'string' &&
    (row.selectedLocationId === null || typeof row.selectedLocationId === 'string') &&
    (row.scheduledDate === null || typeof row.scheduledDate === 'string') &&
    (row.startsAt === null || typeof row.startsAt === 'string') &&
    (row.endsAt === null || typeof row.endsAt === 'string') &&
    Number.isInteger(row.position) &&
    (row.origin === 'PLAN' || row.origin === 'LOCATION') &&
    typeof row.clientOnly === 'boolean'
  );
}

export function parsePlanDraft(raw: string | null, now = Date.now()): PlanDraftPayloadV1 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== PLAN_DRAFT_VERSION ||
      !Number.isInteger(value.basePlanVersion) ||
      typeof value.updatedAt !== 'string' ||
      typeof value.expiresAt !== 'string' ||
      !Array.isArray(value.activities) ||
      value.activities.some((activity) => !validActivity(activity)) ||
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      Date.parse(value.expiresAt) <= now
    )
      return null;
    return value as unknown as PlanDraftPayloadV1;
  } catch {
    return null;
  }
}

export function createPlanDraft(
  plan: PlanViewModel,
  locations: readonly SelectedLocationViewModel[],
  userId: string,
  timezone: string,
  now = Date.now(),
): PlanDraftPayloadV1 {
  const activities = plan.activities.map((activity) => fromActivity(activity, timezone));
  const linked = new Set(
    activities
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  for (const location of locations)
    if (!linked.has(location.id)) {
      activities.push(fromLocation(location, plan, userId, activities.length));
      linked.add(location.id);
    }
  return payload(plan.planVersion, activities, now);
}

function payload(
  basePlanVersion: number,
  activities: readonly PlanDraftActivity[],
  now = Date.now(),
): PlanDraftPayloadV1 {
  const normalized = normalizeActivities(activities);
  return {
    version: 1,
    basePlanVersion,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PLAN_DRAFT_TTL_MS).toISOString(),
    activities: normalized,
  };
}

function normalizeActivities(activities: readonly PlanDraftActivity[]) {
  const groups = new Map<string, PlanDraftActivity[]>();
  for (const activity of activities) {
    const key = activity.scheduledDate ?? 'POOL';
    const group = groups.get(key) ?? [];
    group.push(activity);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) =>
    group
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((activity, position) => ({ ...activity, position })),
  );
}

export function reconcilePlanDraft(
  stored: PlanDraftPayloadV1 | null,
  plan: PlanViewModel,
  locations: readonly SelectedLocationViewModel[],
  userId: string,
  timezone: string,
  now = Date.now(),
) {
  if (!stored) return createPlanDraft(plan, locations, userId, timezone, now);
  // A newer snapshot must never silently discard the user's unsaved intent.
  if (stored.basePlanVersion !== plan.planVersion) return stored;

  const selectedIds = new Set(locations.map((location) => location.id));
  const planIds = new Set(plan.activities.map((activity) => activity.id));
  const activities = stored.activities.filter((activity) => {
    if (activity.origin === 'PLAN') return planIds.has(activity.id);
    if (activity.selectedLocationId?.startsWith('fallback:')) return false;
    return (
      activity.selectedLocationId !== null &&
      (selectedIds.has(activity.selectedLocationId) || activity.scheduledDate !== null)
    );
  });
  const linked = new Set(
    activities
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  for (const location of locations)
    if (!linked.has(location.id)) {
      activities.push(fromLocation(location, plan, userId, activities.length));
      linked.add(location.id);
    }
  return payload(plan.planVersion, activities, now);
}

function orderedForDay(activities: readonly PlanDraftActivity[], day: string) {
  return activities
    .filter((activity) => activity.scheduledDate === day)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

export function draftActivitiesForDay(activities: readonly PlanDraftActivity[], day: string) {
  return orderedForDay(activities, day);
}

export function unscheduledDraftActivities(activities: readonly PlanDraftActivity[]) {
  return activities
    .filter((activity) => activity.scheduledDate === null)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

export function movePlanDraftActivity(
  current: PlanDraftPayloadV1,
  move: PlanDraftMove,
  now = Date.now(),
) {
  const selected = current.activities.find((activity) => activity.id === move.activityId);
  if (!selected) return current;
  let activities = [...current.activities];
  if (move.target.type === 'POOL') {
    const pool = unscheduledDraftActivities(activities).filter((item) => item.id !== selected.id);
    const index = Math.max(0, Math.min(move.target.index ?? pool.length, pool.length));
    if (selected.scheduledDate === null && selected.position === index) return current;
    pool.splice(index, 0, {
      ...selected,
      scheduledDate: null,
      startsAt: null,
      endsAt: null,
    });
    const poolById = new Map(pool.map((item, position) => [item.id, { ...item, position }]));
    activities = activities.map((activity) => poolById.get(activity.id) ?? activity);
    return payload(current.basePlanVersion, activities, now);
  }

  const targetDay = move.target.day;
  const target = orderedForDay(activities, targetDay).filter(
    (activity) => activity.id !== selected.id,
  );
  const index = Math.max(0, Math.min(move.target.index, target.length));
  if (selected.scheduledDate === targetDay && selected.position === index) return current;
  target.splice(index, 0, selected);
  const changes = new Map(
    target.map((activity, position) => [
      activity.id,
      {
        scheduledDate: targetDay,
        position,
        ...(position >= index ? { startsAt: null, endsAt: null } : {}),
      },
    ]),
  );
  activities = activities.map((activity) => {
    const change = changes.get(activity.id);
    return change ? { ...activity, ...change } : activity;
  });
  return payload(current.basePlanVersion, activities, now);
}

function timezoneParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
}

export function localTimeToIso(day: string, time: string, timezone: string) {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let instant = new Date(Date.UTC(year!, month! - 1, date!, hour!, minute!));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = timezoneParts(instant, timezone);
    const wanted = Date.UTC(year!, month! - 1, date!, hour!, minute!);
    const observed = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    instant = new Date(instant.getTime() + wanted - observed);
  }
  return instant.toISOString();
}

export function editPlanDraftActivity(
  current: PlanDraftPayloadV1,
  edit: PlanDraftEdit,
  now = Date.now(),
) {
  const selected = current.activities.find((activity) => activity.id === edit.activityId);
  if (!selected) return current;
  const changedDay = selected.scheduledDate !== edit.day;
  if (changedDay) {
    const moved = movePlanDraftActivity(
      current,
      {
        activityId: selected.id,
        target: {
          type: 'DAY',
          day: edit.day,
          index: orderedForDay(current.activities, edit.day).length,
        },
      },
      now,
    );
    return payload(
      current.basePlanVersion,
      moved.activities.map((activity) =>
        activity.id === selected.id ? { ...activity, title: edit.title.trim() } : activity,
      ),
      now,
    );
  }
  const hasTimes = Boolean(edit.startTime && edit.endTime);
  const startsAt = hasTimes ? localTimeToIso(edit.day, edit.startTime, edit.timezone) : null;
  const endsAt = hasTimes ? localTimeToIso(edit.day, edit.endTime, edit.timezone) : null;
  return payload(
    current.basePlanVersion,
    current.activities.map((activity) => {
      if (activity.id === selected.id)
        return {
          ...activity,
          title: edit.title.trim(),
          scheduledDate: edit.day,
          startsAt,
          endsAt,
          position: selected.position,
        };
      return activity;
    }),
    now,
  );
}

export function validatePlanDraftEdit({
  title,
  day,
  startTime,
  endTime,
  allowedDays,
}: Omit<PlanDraftEdit, 'activityId' | 'timezone'> & { readonly allowedDays: readonly string[] }) {
  if (!title.trim()) return 'Tên hoạt động là bắt buộc.';
  if (title.trim().length > 255) return 'Tên hoạt động không được vượt quá 255 ký tự.';
  if (!allowedDays.includes(day)) return 'Ngày hoạt động phải nằm trong chuyến đi.';
  if (Boolean(startTime) !== Boolean(endTime)) return 'Hãy nhập cả giờ bắt đầu và giờ kết thúc.';
  if (startTime && endTime && endTime <= startTime) return 'Giờ kết thúc phải sau giờ bắt đầu.';
  return null;
}
