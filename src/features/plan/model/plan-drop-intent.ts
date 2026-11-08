import {
  draftActivitiesForDay,
  unscheduledDraftActivities,
  type PlanDraftActivity,
} from './plan-draft';

export type PreviewContainer = 'DAY' | 'POOL';

/** UI-only insertion slot, measured AFTER removing the dragged item. */
export interface PreviewDropIntent {
  readonly activityId: string;
  readonly container: PreviewContainer;
  readonly index: number;
  readonly beforeId: string | null;
  readonly afterId: string | null;
}

export function previewContainerItems(
  activities: readonly PlanDraftActivity[],
  day: string,
  container: PreviewContainer,
) {
  return container === 'DAY'
    ? draftActivitiesForDay(activities, day)
    : unscheduledDraftActivities(activities);
}

export function previewDropIntent(
  activities: readonly PlanDraftActivity[],
  day: string,
  activityId: string,
  container: PreviewContainer,
  index: number,
): PreviewDropIntent | null {
  if (!activities.some((activity) => activity.id === activityId) || !Number.isFinite(index))
    return null;
  const remaining = previewContainerItems(activities, day, container).filter(
    (activity) => activity.id !== activityId,
  );
  const slot = Math.max(0, Math.min(Math.trunc(index), remaining.length));
  return {
    activityId,
    container,
    index: slot,
    beforeId: remaining[slot]?.id ?? null,
    afterId: remaining[slot - 1]?.id ?? null,
  };
}

/**
 * Build an insertion intent from the visible boundary IDs in a list.
 *
 * Pool rows can be filtered by the search field, so a visual "after this row"
 * boundary must be resolved against the complete pool order before it becomes
 * a draft index. The marker IDs remain the visible rows so the insertion line
 * stays attached to what the user is looking at.
 */
export function previewDropIntentFromBoundary(
  activities: readonly PlanDraftActivity[],
  day: string,
  activityId: string,
  container: PreviewContainer,
  boundary: { readonly beforeId: string | null; readonly afterId: string | null },
): PreviewDropIntent | null {
  if (!activities.some((activity) => activity.id === activityId)) return null;
  const remaining = previewContainerItems(activities, day, container).filter(
    (activity) => activity.id !== activityId,
  );
  let slot = remaining.length;
  if (boundary.beforeId !== null) {
    const beforeIndex = remaining.findIndex((activity) => activity.id === boundary.beforeId);
    if (beforeIndex < 0) return null;
    slot = beforeIndex;
  } else if (boundary.afterId !== null) {
    const afterIndex = remaining.findIndex((activity) => activity.id === boundary.afterId);
    if (afterIndex < 0) return null;
    slot = afterIndex + 1;
  }
  return {
    activityId,
    container,
    index: slot,
    beforeId: boundary.beforeId ?? remaining[slot]?.id ?? null,
    afterId: boundary.afterId ?? remaining[slot - 1]?.id ?? null,
  };
}

/** Convert a before/after boundary in the original order to a post-removal slot. */
export function previewInsertionIndex(sourceIndex: number, boundary: number) {
  return boundary - (sourceIndex >= 0 && sourceIndex < boundary ? 1 : 0);
}

export function isPreviewDropNoop(
  activities: readonly PlanDraftActivity[],
  day: string,
  intent: PreviewDropIntent,
) {
  return (
    previewContainerItems(activities, day, intent.container).findIndex(
      (activity) => activity.id === intent.activityId,
    ) === intent.index
  );
}
