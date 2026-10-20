import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlanViewModel, SelectedLocationViewModel } from '../model/plan';
import {
  editPlanDraftActivity,
  movePlanDraftActivity,
  parsePlanDraft,
  planDraftKey,
  reconcilePlanDraft,
  type PlanDraftEdit,
  type PlanDraftMove,
  type PlanDraftPayloadV1,
} from '../model/plan-draft';

const memory = new Map<string, PlanDraftPayloadV1>();
const EVENT = 'wolfari:plan-draft-change';
const EMPTY_DRAFT: PlanDraftPayloadV1 = Object.freeze({
  version: 1,
  basePlanVersion: 0,
  updatedAt: '1970-01-01T00:00:00.000Z',
  expiresAt: '1970-01-01T00:00:00.000Z',
  activities: [],
});

function stored(key: string) {
  const local = memory.get(key);
  if (local) return local;
  if (typeof window === 'undefined') return null;
  try {
    return parsePlanDraft(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function persist(key: string, payload: PlanDraftPayloadV1) {
  memory.set(key, payload);
  let saved = false;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
    saved = true;
  } catch {
    // Keep the in-memory draft usable and expose the degraded state to the UI.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
  return saved;
}

export function usePlanDraft({
  userId,
  tripId,
  plan,
  locations,
  timezone,
}: {
  userId: string;
  tripId: string;
  plan: PlanViewModel | null;
  locations: readonly SelectedLocationViewModel[];
  timezone: string;
}) {
  const key = planDraftKey(userId, tripId);
  const initial = useMemo(
    () => plan ? reconcilePlanDraft(stored(key), plan, locations, userId, timezone) : EMPTY_DRAFT,
    [key, locations, plan, timezone, userId],
  );
  const [payload, setPayload] = useState(initial);
  const [storageStatus, setStorageStatus] = useState<'saved' | 'memory'>('saved');

  useEffect(() => {
    if (!plan || !userId || !tripId) return;
    const reconciled = reconcilePlanDraft(stored(key), plan, locations, userId, timezone);
    setPayload(reconciled);
    setStorageStatus(persist(key, reconciled) ? 'saved' : 'memory');
  }, [key, locations, plan, timezone, userId]);

  useEffect(() => {
    if (!plan || !userId || !tripId) return;
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key && detail.key !== key) return;
      const next = reconcilePlanDraft(stored(key), plan, locations, userId, timezone);
      setPayload(next);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) sync(event);
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', storage);
    };
  }, [key, locations, plan, timezone, userId]);

  const update = useCallback(
    (transform: (current: PlanDraftPayloadV1) => PlanDraftPayloadV1) => {
      setPayload((current) => {
        const next = transform(current);
        setStorageStatus(persist(key, next) ? 'saved' : 'memory');
        return next;
      });
    },
    [key],
  );

  return {
    activities: payload.activities,
    storageStatus,
    move(move: PlanDraftMove) {
      if (!plan) return;
      update((current) => movePlanDraftActivity(current, move));
    },
    edit(edit: PlanDraftEdit) {
      if (!plan) return;
      update((current) => editPlanDraftActivity(current, edit));
    },
  };
}
