/**
 * Day placement helpers for server-backed Plan ordering.
 *
 * The backend stores one Trip-wide `position` (0-based, ordered by position then id).
 * A PATCH with `position: P` removes the activity and re-inserts it at index P of the
 * remaining list. Day groups are projections of that one list, so the client converts
 * "index inside a day" into the Trip-wide index here.
 */

/** `null` means the unscheduled pool. ISO dates compare lexically. */
export type PlacementDay = string | null;

interface Placeable {
  readonly id: string;
}

function after(day: PlacementDay, target: PlacementDay) {
  if (target === null) return false;
  return day === null || day > target;
}

export function globalPositionFor<T extends Placeable>({
  orderedActivities,
  dayOf,
  targetDay,
  targetIndex,
  movingId,
}: {
  /** Every Trip activity in server order. */
  readonly orderedActivities: readonly T[];
  readonly dayOf: (activity: T) => PlacementDay;
  readonly targetDay: PlacementDay;
  /**
   * Index inside the target day after removing the moving activity. Dropping on a row
   * passes that row's index in the day list (array-move semantics); appending passes
   * the day length.
   */
  readonly targetIndex: number;
  readonly movingId?: string;
}): number {
  const rest = orderedActivities.filter((activity) => activity.id !== movingId);
  const day = rest.filter((activity) => dayOf(activity) === targetDay);
  const index = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : 0, day.length));
  if (index < day.length) return rest.indexOf(day[index]!);
  if (day.length) return rest.indexOf(day[day.length - 1]!) + 1;
  // Empty day: keep Trip order readable by placing it before the first later day.
  const later = rest.findIndex((activity) => after(dayOf(activity), targetDay));
  return later < 0 ? rest.length : later;
}

/** Mirror the backend reorder locally for optimistic display. */
export function applyPlacement<T extends Placeable & { readonly position: number }>(
  orderedActivities: readonly T[],
  movingId: string,
  position: number,
  patch: Partial<T> = {},
): T[] {
  const moving = orderedActivities.find((activity) => activity.id === movingId);
  if (!moving) return [...orderedActivities];
  const rest = orderedActivities.filter((activity) => activity.id !== movingId);
  rest.splice(Math.max(0, Math.min(position, rest.length)), 0, { ...moving, ...patch });
  return rest.map((activity, index) =>
    activity.position === index ? activity : { ...activity, position: index },
  );
}
