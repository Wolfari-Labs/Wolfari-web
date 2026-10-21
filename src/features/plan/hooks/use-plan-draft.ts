import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  browserStorage,
  createStorageFallback,
  type StorageStatus,
} from '../../../shared/lib/browser-storage';
import type { PlanViewModel, SelectedLocationViewModel } from '../model/plan';
import {
  editPlanDraftActivity,
  movePlanDraftActivity,
  parsePlanDraft,
  planDraftKey,
  reconcilePlanDraft,
  type PlanDraftActivity,
  type PlanDraftEdit,
  type PlanDraftMove,
  type PlanDraftPayloadV1,
} from '../model/plan-draft';

const storage = createStorageFallback();
const EVENT = 'wolfari:plan-draft-change';
const EMPTY_DRAFT: PlanDraftPayloadV1 = Object.freeze({
  version: 1,
  basePlanVersion: 0,
  updatedAt: '1970-01-01T00:00:00.000Z',
  expiresAt: '1970-01-01T00:00:00.000Z',
  activities: [],
});

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
  const reconcile = useCallback(
    (raw: string | null) =>
      plan
        ? reconcilePlanDraft(parsePlanDraft(raw), plan, locations, userId, timezone)
        : EMPTY_DRAFT,
    [locations, plan, timezone, userId],
  );
  const initial = useMemo(() => {
    const entry = storage.read(browserStorage('localStorage'), key);
    return { payload: reconcile(entry.raw), status: entry.status };
  }, [key, reconcile]);
  const [payload, setPayload] = useState(initial.payload);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(initial.status);

  useEffect(() => {
    if (!plan || !userId || !tripId) return;
    const sync = () => {
      const entry = storage.read(browserStorage('localStorage'), key);
      setPayload(reconcile(entry.raw));
      setStorageStatus(entry.status);
    };
    sync();
    const local = (event: Event) => {
      if ((event as CustomEvent<{ key: string }>).detail.key === key) sync();
    };
    const remote = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== browserStorage('localStorage')) return;
      if (event.key !== key && event.key !== null) return;
      // Never write remote snapshots back, including removeItem/clear.
      const raw = event.key === null ? null : event.newValue;
      storage.accept(key, raw);
      setPayload(reconcile(raw));
      setStorageStatus('saved');
    };
    window.addEventListener(EVENT, local);
    window.addEventListener('storage', remote);
    return () => {
      window.removeEventListener(EVENT, local);
      window.removeEventListener('storage', remote);
    };
  }, [key, reconcile, plan, userId, tripId]);

  const update = useCallback(
    async (transform: (current: PlanDraftPayloadV1) => PlanDraftPayloadV1 | null) => {
      const commit = () => {
        const entry = storage.read(browserStorage('localStorage'), key);
        const current = reconcile(entry.raw);
        const next = transform(current);
        if (!next) {
          setPayload(current);
          setStorageStatus(entry.status);
          return false;
        }
        const status = storage.write(browserStorage('localStorage'), key, JSON.stringify(next));
        setPayload(next);
        setStorageStatus(status);
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
        return true;
      };
      // Serialize cooperating tabs where Web Locks is available; read inside it.
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return navigator.locks.request(key, commit);
      }
      return commit();
    },
    [key, reconcile],
  );

  return {
    activities: payload.activities,
    storageStatus,
    move(move: PlanDraftMove) {
      if (plan) void update((current) => movePlanDraftActivity(current, move));
    },
    async edit(edit: PlanDraftEdit, expected: PlanDraftActivity) {
      if (!plan) return false;
      return update((current) => {
        const latest = current.activities.find((activity) => activity.id === edit.activityId);
        if (JSON.stringify(latest) !== JSON.stringify(expected)) return null;
        return editPlanDraftActivity(current, edit);
      });
    },
  };
}
