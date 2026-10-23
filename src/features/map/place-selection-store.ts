import { useSyncExternalStore } from 'react';
import { browserStorage, createStorageFallback, type StorageStatus } from '../../shared/lib/browser-storage';
import type { ActivityViewModel, SelectedLocationViewModel } from '../plan/model/plan';

export const PLACE_SELECTION_VERSION = 1;
const PREFIX = 'wolfari:place-selection:v1:';
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LocalPlaceSelection extends SelectedLocationViewModel {
  readonly provider: 'google';
  readonly providerPlaceId: string;
  readonly category: string | null;
  readonly fetchedAt: string;
  readonly local: true;
}

export interface PlaceSelectionPayload {
  readonly version: 1;
  readonly places: readonly LocalPlaceSelection[];
  readonly hiddenLocationIds: readonly string[];
}

/** Apply device-local choices to the read-only Plan projection. */
export function mergePlaceSelections(
  backendLocations: readonly SelectedLocationViewModel[],
  activities: readonly ActivityViewModel[],
  localSelection: PlaceSelectionPayload,
): readonly SelectedLocationViewModel[] {
  const scheduledIds = new Set(
    activities
      .map((activity) => activity.selectedLocationId)
      .filter((id): id is string => id !== null),
  );
  const hidden = new Set(localSelection.hiddenLocationIds);
  const visibleBackend = backendLocations.filter(
    (location) => scheduledIds.has(location.id) || !hidden.has(location.id),
  );
  const seen = new Set<string>();
  const dedupedBackend = visibleBackend.filter((location) => {
    const key = `${location.provider ?? ''}:${location.providerPlaceId ?? location.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const backendProviderIds = new Set(
    dedupedBackend
      .map((location) => `${location.provider ?? ''}:${location.providerPlaceId ?? ''}`)
      .filter((key) => key !== ':'),
  );
  const visibleLocal = localSelection.places.filter(
    (place) =>
      place.tripId === (backendLocations[0]?.tripId ?? place.tripId) &&
      !backendProviderIds.has(`google:${place.providerPlaceId}`),
  );
  return [...dedupedBackend, ...visibleLocal.filter((place) => !seen.has(`google:${place.providerPlaceId}`))];
}

const EMPTY_PAYLOAD: PlaceSelectionPayload = Object.freeze({ version: 1, places: [], hiddenLocationIds: [] });
const empty = (): PlaceSelectionPayload => EMPTY_PAYLOAD;
const listeners = new Map<string, Set<() => void>>();
const storage = createStorageFallback();
const snapshotCache = new Map<string, { raw: string | null; payload: PlaceSelectionPayload; validUntil: number }>();

export function placeSelectionKey(userId: string, tripId: string) {
  return `${PREFIX}${userId}:${tripId}`;
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function isPlace(value: unknown): value is LocalPlaceSelection {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    row.local === true &&
    typeof row.id === 'string' &&
    typeof row.tripId === 'string' &&
    typeof row.name === 'string' &&
    row.provider === 'google' &&
    typeof row.providerPlaceId === 'string' &&
    typeof row.fetchedAt === 'string' && Number.isFinite(Date.parse(row.fetchedAt))
  );
}

export function parsePlaceSelection(value: string | null): PlaceSelectionPayload {
  if (!value) return empty();
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== PLACE_SELECTION_VERSION || !Array.isArray(parsed.places)) return empty();
    const now = Date.now();
    const places = parsed.places.filter(isPlace).filter((place) =>
      // Ignore synthetic suggestions persisted by older previews. These IDs
      // were generated locally and never represented Google Places results.
      !(place.id.startsWith('fallback:') && place.providerPlaceId.startsWith('fallback-')) &&
      now - Date.parse(place.fetchedAt) <= MAX_CACHE_AGE_MS,
    );
    const hiddenLocationIds = Array.isArray(parsed.hiddenLocationIds)
      ? parsed.hiddenLocationIds.filter((id): id is string => typeof id === 'string')
      : [];
    return { version: 1, places, hiddenLocationIds };
  } catch {
    return empty();
  }
}

function read(key: string): PlaceSelectionPayload {
  if (typeof window === 'undefined') return empty();
  const { raw } = storage.read(browserStorage('localStorage'), key);
  const cached = snapshotCache.get(key);
  if (cached?.raw === raw && Date.now() < cached.validUntil) return cached.payload;
  const payload = parsePlaceSelection(raw);
  snapshotCache.set(key, { raw, payload, validUntil: payload.places.reduce(
    (earliest, place) => Math.min(earliest, Date.parse(place.fetchedAt) + MAX_CACHE_AGE_MS),
    Number.POSITIVE_INFINITY,
  ) });
  return payload;
}

function write(key: string, payload: PlaceSelectionPayload) {
  const raw = JSON.stringify(payload);
  const status = storage.write(browserStorage('localStorage'), key, raw);
  snapshotCache.delete(key);
  notify(key);
  return status;
}

export function readPlaceSelection(userId: string, tripId: string) {
  return read(placeSelectionKey(userId, tripId));
}

export function savePlaceSelection(userId: string, tripId: string, place: LocalPlaceSelection) {
  const key = placeSelectionKey(userId, tripId);
  const current = read(key);
  const places = current.places.filter((item) => item.providerPlaceId !== place.providerPlaceId);
  return write(key, { ...current, places: [...places, place] });
}

export function hideSavedLocation(userId: string, tripId: string, locationId: string) {
  const key = placeSelectionKey(userId, tripId);
  const current = read(key);
  if (!current.hiddenLocationIds.includes(locationId))
    return write(key, { ...current, hiddenLocationIds: [...current.hiddenLocationIds, locationId] });
  return storage.read(browserStorage('localStorage'), key).status;
}

export function removePlaceSelection(userId: string, tripId: string, providerPlaceId: string) {
  const key = placeSelectionKey(userId, tripId);
  const current = read(key);
  return write(key, { ...current, places: current.places.filter((item) => item.providerPlaceId !== providerPlaceId) });
}

function subscribe(key: string, listener: () => void) {
      const set = listeners.get(key) ?? new Set<() => void>();
      set.add(listener);
      listeners.set(key, set);
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== browserStorage('localStorage')) return;
        if (event.key !== key && event.key !== null) return;
        storage.accept(key, event.key === null ? null : event.newValue);
        snapshotCache.delete(key);
        listener();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener('storage', onStorage);
        set.delete(listener);
        if (!set.size) listeners.delete(key);
      };
}

export function usePlaceSelection(userId: string, tripId: string) {
  const key = placeSelectionKey(userId, tripId);
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => read(key),
    () => empty(),
  );
}

export function usePlaceSelectionStorageStatus(userId: string, tripId: string): StorageStatus {
  const key = placeSelectionKey(userId, tripId);
  return useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => storage.read(browserStorage('localStorage'), key).status,
    () => 'memory',
  );
}
