import { validCalendarDate } from '../../../shared/lib/calendar';
import type { DomainError } from '../../../shared/types/result';
import type { PlanCommand, PlanCommandOutcome } from '../hooks/use-plan-commands';
import type {
  ActivityCreateInput,
  ActivityViewModel,
  PlanCommandResult,
  PlanRepository,
  PlanViewModel,
  SelectedLocationViewModel,
} from './plan';
import { localDate } from './plan-presentation';

/** UI-only move: the target index is measured AFTER removing the source activity. */
export type GatewayPlanMove = {
  readonly source: { readonly type: 'ACTIVITY' | 'LOCATION'; readonly id: string };
  readonly target: { readonly day: string | null; readonly index: number };
};

type PlanArrangementStep =
  | { readonly kind: 'create'; readonly activity: ActivityCreateInput }
  | {
      readonly kind: 'schedule';
      readonly activityId: string;
      readonly scheduledDate: string | null;
    }
  | {
      readonly kind: 'reorder';
      /** A single null is the ID from this arrangement's confirmed create receipt. */
      readonly activityIds: readonly (string | null)[];
    };

/** Durable frontend intent, never an API payload or a replacement for the server snapshot. */
export type PlanArrangementIntent = {
  readonly kind: 'arrange';
  readonly basePlanVersion: number;
  readonly steps: readonly PlanArrangementStep[];
};

function activityDay(activity: ActivityViewModel, timezone: string): string | null {
  return activity.startsAt
    ? localDate(activity.startsAt, timezone)
    : (activity.scheduledDate ?? null);
}

function locationActivityType(location: SelectedLocationViewModel) {
  const type = Array.isArray(location.metadata.types)
    ? location.metadata.types.find((value): value is string => typeof value === 'string')
    : null;
  if (type === 'restaurant' || type === 'cafe' || type === 'meal_takeaway') return 'MEAL';
  if (type === 'beach') return 'BEACH';
  if (type === 'park' || type === 'hiking_area') return 'WALK';
  return 'SIGHTSEEING';
}

/** Snapshot every write before sending anything; unrelated activities keep their relative order. */
export function buildPlanArrangement(
  plan: PlanViewModel,
  timezone: string,
  move: GatewayPlanMove,
): PlanArrangementIntent | null {
  const { source, target } = move;
  if (
    !plan.permissions.canEdit ||
    !revision(plan.planVersion) ||
    !Number.isInteger(target.index) ||
    target.index < 0 ||
    (target.day !== null && !validCalendarDate(target.day))
  )
    return null;
  const ordered = [...plan.activities].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  if (new Set(ordered.map((activity) => activity.id)).size !== ordered.length) return null;
  const dragged =
    source.type === 'ACTIVITY' ? ordered.find((activity) => activity.id === source.id) : null;
  const location =
    source.type === 'LOCATION'
      ? plan.selectedLocations.find((item) => item.id === source.id)
      : null;
  if (source.type === 'ACTIVITY' && !dragged) return null;
  if (
    source.type === 'LOCATION' &&
    (!location ||
      target.day === null ||
      ordered.some((activity) => activity.selectedLocationId === location.id))
  )
    return null;

  const days = new Map<string, string | null>();
  try {
    for (const activity of ordered) days.set(activity.id, activityDay(activity, timezone));
  } catch {
    // Invalid timezone/instant snapshots must never produce partial writes.
    return null;
  }
  const currentGroup = ordered.filter((activity) => days.get(activity.id) === target.day);
  const rest = ordered.filter((activity) => activity.id !== dragged?.id);
  const targetGroup = rest.filter((activity) => days.get(activity.id) === target.day);
  if (target.index > targetGroup.length) return null;
  if (
    dragged &&
    days.get(dragged.id) === target.day &&
    currentGroup.findIndex((activity) => activity.id === dragged.id) === target.index
  )
    return null;

  const steps: PlanArrangementStep[] = [];
  if (location) {
    const title = location.name.trim();
    if (!title || title.length > 255) return null;
    steps.push({
      kind: 'create',
      activity: {
        title,
        activityType: locationActivityType(location),
        description: location.address,
        publicDescription: null,
        selectedLocationId: location.id,
        startsAt: null,
        endsAt: null,
        scheduledDate: target.day,
        position: ordered.length,
      },
    });
  }
  const reset = (activity: ActivityViewModel, day: string | null) => {
    if (
      activity.startsAt !== null ||
      activity.endsAt !== null ||
      (activity.scheduledDate ?? null) !== day
    )
      steps.push({ kind: 'schedule', activityId: activity.id, scheduledDate: day });
  };
  if (dragged) reset(dragged, target.day);
  // A return to the pool resets only the dragged item, never its old/new neighbours.
  if (target.day !== null)
    for (const activity of targetGroup.slice(target.index)) reset(activity, target.day);

  const before = targetGroup[target.index];
  const after = targetGroup.at(-1);
  const insertion = before
    ? rest.findIndex((activity) => activity.id === before.id)
    : after
      ? rest.findIndex((activity) => activity.id === after.id) + 1
      : rest.length;
  const activityIds: (string | null)[] = rest.map((activity) => activity.id);
  activityIds.splice(insertion, 0, dragged?.id ?? null);
  steps.push({ kind: 'reorder', activityIds });
  return { kind: 'arrange', basePlanVersion: plan.planVersion, steps };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function revision(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 2147483647;
}
function nullableDate(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && validCalendarDate(value));
}

/** Reject malformed/injected storage rather than resuming a broader command than the UI made. */
export function parsePlanArrangement(value: unknown): PlanArrangementIntent | null {
  if (
    !record(value) ||
    !exactKeys(value, ['kind', 'basePlanVersion', 'steps']) ||
    value.kind !== 'arrange' ||
    !revision(value.basePlanVersion) ||
    !Array.isArray(value.steps) ||
    !value.steps.length
  )
    return null;
  const steps: PlanArrangementStep[] = [];
  const scheduled = new Set<string>();
  let created = false;
  for (const [index, step] of value.steps.entries()) {
    if (!record(step)) return null;
    if (step.kind === 'create') {
      if (index !== 0 || !exactKeys(step, ['kind', 'activity']) || !record(step.activity))
        return null;
      const activity = step.activity;
      if (
        !exactKeys(activity, [
          'title',
          'activityType',
          'description',
          'publicDescription',
          'selectedLocationId',
          'startsAt',
          'endsAt',
          'scheduledDate',
          'position',
        ]) ||
        !identifier(activity.title) ||
        activity.title.trim().length > 255 ||
        !identifier(activity.activityType) ||
        activity.activityType.trim().length > 40 ||
        (activity.description !== null && typeof activity.description !== 'string') ||
        activity.publicDescription !== null ||
        !identifier(activity.selectedLocationId) ||
        activity.startsAt !== null ||
        activity.endsAt !== null ||
        typeof activity.scheduledDate !== 'string' ||
        !validCalendarDate(activity.scheduledDate) ||
        !Number.isInteger(activity.position) ||
        Number(activity.position) < 0 ||
        Number(activity.position) > 2147483647
      )
        return null;
      created = true;
      steps.push({ kind: 'create', activity: { ...activity } as unknown as ActivityCreateInput });
    } else if (step.kind === 'schedule') {
      if (
        !exactKeys(step, ['kind', 'activityId', 'scheduledDate']) ||
        !identifier(step.activityId) ||
        scheduled.has(step.activityId) ||
        !nullableDate(step.scheduledDate)
      )
        return null;
      scheduled.add(step.activityId);
      steps.push({
        kind: 'schedule',
        activityId: step.activityId,
        scheduledDate: step.scheduledDate,
      });
    } else if (step.kind === 'reorder') {
      if (
        index !== value.steps.length - 1 ||
        !exactKeys(step, ['kind', 'activityIds']) ||
        !Array.isArray(step.activityIds) ||
        !step.activityIds.length ||
        !step.activityIds.every((id) => id === null || identifier(id)) ||
        new Set(step.activityIds).size !== step.activityIds.length ||
        step.activityIds.filter((id) => id === null).length !== (created ? 1 : 0)
      )
        return null;
      const ids = step.activityIds;
      if ([...scheduled].some((id) => !ids.includes(id))) return null;
      const create = steps[0];
      if (create?.kind === 'create' && create.activity.position !== step.activityIds.length - 1)
        return null;
      steps.push({ kind: 'reorder', activityIds: [...step.activityIds] });
    } else return null;
  }
  if (steps.at(-1)?.kind !== 'reorder') return null;
  return { kind: 'arrange', basePlanVersion: value.basePlanVersion, steps };
}

const unavailable: DomainError = {
  code: 'SERVICE_UNAVAILABLE',
  correlationId: null,
  retryable: false,
};

/** UUIDv8: deterministic per-step operation IDs accepted by the unchanged Gateway contract. */
async function stepKey(root: string, index: number) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`wolfari:plan-arrangement:v1:${root}:${index}`),
  );
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Each existing endpoint is atomic, but the arrangement is NOT. Exact receipt replay precedes
 * version checking on the Backend; never rebase a failed sequence onto a newly read version.
 */
export function restorePlanArrangementCommand(
  repository: PlanRepository,
  tripId: string,
  payload: unknown,
): PlanCommand | null {
  const intent = parsePlanArrangement(payload);
  if (
    !intent ||
    !identifier(tripId) ||
    !repository.reorderActivities ||
    (intent.steps.some((step) => step.kind === 'create') && !repository.createActivity) ||
    (intent.steps.some((step) => step.kind === 'schedule') && !repository.updateActivity)
  )
    return null;
  const command: PlanCommand = async (context) => {
    if (context.expectedPlanVersion !== intent.basePlanVersion)
      return {
        status: 'error',
        error: { code: 'VERSION_CONFLICT', correlationId: null, retryable: false },
      };
    let version = context.expectedPlanVersion;
    let createdId: string | null = null;
    let confirmed = 0;
    let attempted = false;
    let correlationId: string | null = null;
    const failure = (error: DomainError): PlanCommandOutcome => ({
      status: 'error',
      error,
      partialFailure:
        confirmed > 0 ||
        (attempted && error.code === 'SERVICE_UNAVAILABLE' && intent.steps.length > 1),
    });
    try {
      for (const [index, step] of intent.steps.entries()) {
        context.signal.throwIfAborted();
        const idempotencyKey = await stepKey(context.idempotencyKey, index);
        context.signal.throwIfAborted();
        const common = {
          tripId,
          signal: context.signal,
          expectedPlanVersion: version,
          idempotencyKey,
        };
        let result: PlanCommandResult<unknown>;
        attempted = true;
        if (step.kind === 'create')
          result = await repository.createActivity!({ ...common, activity: { ...step.activity } });
        else if (step.kind === 'schedule')
          result = await repository.updateActivity!({
            ...common,
            activityId: step.activityId,
            fields: { startsAt: null, endsAt: null, scheduledDate: step.scheduledDate },
          });
        else {
          const activityIds = step.activityIds.map((id) => id ?? createdId);
          if (
            activityIds.some((id) => id === null) ||
            new Set(activityIds).size !== activityIds.length
          )
            return failure(unavailable);
          result = await repository.reorderActivities!({
            ...common,
            activityIds: activityIds as string[],
          });
        }
        if (result.status === 'error') return failure(result.error);
        // A no-op receipt may retain its version. Only confirmed receipts advance the chain.
        if (
          !record(result.data) ||
          !revision(result.data.planVersion) ||
          result.data.planVersion < version ||
          result.data.planVersion > version + 1
        )
          return failure(unavailable);
        if (step.kind === 'create') {
          if (!identifier(result.data.id) || result.data.planVersion !== version + 1)
            return failure(unavailable);
          createdId = result.data.id;
        }
        version = result.data.planVersion;
        correlationId = result.correlationId;
        confirmed += 1;
      }
      return { status: 'success', data: { planVersion: version }, correlationId };
    } catch {
      return failure(unavailable);
    }
  };
  command.arrangement = true;
  return command;
}
