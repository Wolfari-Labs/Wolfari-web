import type { PlanCommand } from '../hooks/use-plan-commands';
import type { ActivityCreateInput, ActivityUpdateFields, PlanRepository } from './plan';

export type PlanCommandIntent =
  | { kind: 'create'; activity: ActivityCreateInput }
  | { kind: 'update'; activityId: string; fields: ActivityUpdateFields }
  | { kind: 'delete'; activityId: string }
  | { kind: 'completion'; activityId: string; status: 'TODO' | 'COMPLETED' }
  | { kind: 'reorder'; activityIds: readonly string[] };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function fields(value: unknown, create: boolean): ActivityUpdateFields | null {
  if (
    !record(value) ||
    !Object.keys(value).length ||
    !keys(value, [
      'title',
      'activityType',
      'description',
      'publicDescription',
      'selectedLocationId',
      'startsAt',
      'endsAt',
      'position',
    ])
  )
    return null;
  if (create && !['title', 'activityType', 'position'].every((key) => Object.hasOwn(value, key)))
    return null;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'position') {
      if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 2147483647)
        return null;
    } else if (key === 'title' || key === 'activityType') {
      if (!identifier(item) || item.trim().length > (key === 'title' ? 255 : 40)) return null;
    } else if (item !== null && typeof item !== 'string') return null;
    else if (key === 'selectedLocationId' && item !== null && !identifier(item)) return null;
    else if (
      (key === 'startsAt' || key === 'endsAt') &&
      item !== null &&
      !Number.isFinite(Date.parse(item as string))
    )
      return null;
  }
  // Copy only validated own properties so the recovered command cannot mutate with its source object.
  return { ...value } as ActivityUpdateFields;
}

/** Reconstruct a stored intent without trusting storage as executable command input. */
export function restorePlanCommand(
  repository: PlanRepository,
  tripId: string,
  payload: unknown,
): PlanCommand | null {
  if (!identifier(tripId) || !record(payload)) return null;
  switch (payload.kind) {
    case 'create': {
      if (!keys(payload, ['kind', 'activity']) || !repository.createActivity) return null;
      const activity = fields(payload.activity, true);
      if (!activity) return null;
      return (context) =>
        repository.createActivity!({
          ...context,
          tripId,
          activity: { ...activity } as ActivityCreateInput,
        });
    }
    case 'update': {
      if (
        !keys(payload, ['kind', 'activityId', 'fields']) ||
        !identifier(payload.activityId) ||
        !repository.updateActivity
      )
        return null;
      const update = fields(payload.fields, false),
        activityId = payload.activityId;
      if (!update) return null;
      return (context) =>
        repository.updateActivity!({ ...context, tripId, activityId, fields: { ...update } });
    }
    case 'delete': {
      if (
        !keys(payload, ['kind', 'activityId']) ||
        !identifier(payload.activityId) ||
        !repository.deleteActivity
      )
        return null;
      const activityId = payload.activityId;
      return (context) => repository.deleteActivity!({ ...context, tripId, activityId });
    }
    case 'completion': {
      if (
        !keys(payload, ['kind', 'activityId', 'status']) ||
        !identifier(payload.activityId) ||
        (payload.status !== 'TODO' && payload.status !== 'COMPLETED') ||
        !repository.setActivityCompletion
      )
        return null;
      const activityId = payload.activityId,
        status = payload.status;
      return (context) =>
        repository.setActivityCompletion!({ ...context, tripId, activityId, status });
    }
    case 'reorder': {
      if (
        !keys(payload, ['kind', 'activityIds']) ||
        !Array.isArray(payload.activityIds) ||
        !payload.activityIds.every(identifier) ||
        new Set(payload.activityIds).size !== payload.activityIds.length ||
        !repository.reorderActivities
      )
        return null;
      const activityIds = [...payload.activityIds];
      return (context) =>
        repository.reorderActivities!({ ...context, tripId, activityIds: [...activityIds] });
    }
    default:
      return null;
  }
}
