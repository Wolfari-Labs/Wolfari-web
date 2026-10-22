import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage, createStorageFallback } from '../src/shared/lib/browser-storage';
import {
  clearCreateTripDraft,
  emptyCreateTripDraft,
  readCreateTripDraft,
  writeCreateTripDraft,
} from '../src/features/trips/create/create-trip';
import {
  hideSavedLocation,
  parsePlaceSelection,
  readPlaceSelection,
  removePlaceSelection,
  savePlaceSelection,
  type LocalPlaceSelection,
} from '../src/features/map/place-selection-store';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('safe browser storage', () => {
  it('does not restore synthetic Google suggestions persisted by older previews', () => {
    const place = {
      id: 'fallback:cho-han',
      tripId: 'trip',
      name: 'Chợ Hàn',
      provider: 'google',
      providerPlaceId: 'fallback-cho-han',
      fetchedAt: new Date().toISOString(),
      local: true,
    };
    const real = { ...place, id: 'provider:real', providerPlaceId: 'real-google-id' };
    expect(
      parsePlaceSelection(
        JSON.stringify({ version: 1, places: [place, real], hiddenLocationIds: [] }),
      ).places,
    ).toEqual([real]);
  });
  it.each(['localStorage', 'sessionStorage'] as const)('handles a throwing %s getter', (kind) => {
    vi.spyOn(window, kind, 'get').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    expect(browserStorage(kind)).toBeNull();
  });

  it('retains quota-failed writes and failed removals without resurrecting old data', () => {
    const cache = createStorageFallback();
    sessionStorage.setItem('key', 'old');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(cache.write(sessionStorage, 'key', 'new')).toBe('memory');
    expect(cache.read(sessionStorage, 'key').raw).toBe('new');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    expect(cache.write(sessionStorage, 'key', null)).toBe('memory');
    expect(cache.read(sessionStorage, 'key').raw).toBeNull();
    cache.accept('key', 'remote');
    expect(cache.read(null, 'key').raw).toBe('remote');
  });

  it('keeps CreateTrip edits in memory and clears them even when storage is blocked', () => {
    const draft = { ...emptyCreateTripDraft(), name: 'Unsaved trip' };
    expect(writeCreateTripDraft(null, draft)).toBe('memory');
    expect(readCreateTripDraft(null)).toEqual(draft);
    expect(clearCreateTripDraft(null)).toBe('memory');
    expect(readCreateTripDraft(null)).toBeNull();
  });

  it('keeps place selection/hide/remove usable after getItem and setItem throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    const place = {
      id: 'local:place',
      tripId: 'storage-failure',
      name: 'Local place',
      provider: 'google',
      providerPlaceId: 'provider-place',
      fetchedAt: new Date().toISOString(),
      local: true,
      category: null,
    } as LocalPlaceSelection;
    expect(savePlaceSelection('storage-user', place.tripId, place)).toBe('memory');
    expect(readPlaceSelection('storage-user', place.tripId).places).toEqual([place]);
    expect(hideSavedLocation('storage-user', place.tripId, 'backend-place')).toBe('memory');
    expect(readPlaceSelection('storage-user', place.tripId).hiddenLocationIds).toEqual([
      'backend-place',
    ]);
    expect(removePlaceSelection('storage-user', place.tripId, place.providerPlaceId)).toBe(
      'memory',
    );
    expect(readPlaceSelection('storage-user', place.tripId).places).toEqual([]);
  });
});
