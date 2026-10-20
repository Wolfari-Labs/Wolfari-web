import { afterEach, describe, expect, it } from 'vitest';
import {
  CREATE_TRIP_DRAFT_KEY,
  clearCreateTripDraft,
  createTripIntentFromDraft,
  emptyCreateTripDraft,
  readCreateTripDraft,
  validateCreateTripDraft,
  writeCreateTripDraft,
} from '../src/features/trips/create/create-trip';
import { groupDressCodes } from '../src/features/dress-code/dress-code';
import { groupPackingItems, packingProgress } from '../src/features/packing/packing';
import {
  activityDurationLabel,
  activityScheduleLabel,
  selectMapLocations,
  validCoordinates,
} from '../src/features/map/trip-map';
import type { ActivityViewModel, DressCodeViewModel, PackingItemViewModel, SelectedLocationViewModel } from '../src/features/plan/model/plan';

afterEach(() => window.sessionStorage.clear());

describe('Create Trip draft contract', () => {
  it('trims for validation, accepts same-day travel and rejects reversed dates', () => {
    expect(validateCreateTripDraft({ ...emptyCreateTripDraft(), name: '  ' })).toMatchObject({ name: expect.any(String), startDate: expect.any(String), endDate: expect.any(String) });
    expect(validateCreateTripDraft({ ...emptyCreateTripDraft(), name: ' Đà Nẵng ', destination: 'Đà Nẵng', startDate: '2026-10-20', endDate: '2026-10-20' })).toEqual({});
    expect(validateCreateTripDraft({ ...emptyCreateTripDraft(), name: 'Trip', destination: 'Huế', startDate: '2026-10-21', endDate: '2026-10-20' }).endDate).toBeTruthy();
    expect(validateCreateTripDraft({ ...emptyCreateTripDraft(), name: 'x'.repeat(201), destination: 'Huế', startDate: '2026-10-20', endDate: '2026-10-21' }).name).toBeTruthy();
  });

  it('maps inclusive UI dates to the verified write contract and keeps the request id stable', () => {
    const draft = { ...emptyCreateTripDraft(), name: ' Miền Trung ', destination: 'Đà Nẵng', description: ' Hội bạn ', startDate: '2026-10-20', endDate: '2026-10-20' };
    expect(createTripIntentFromDraft(draft)).toEqual({
      name: 'Miền Trung',
      description: 'Hội bạn',
      startAt: '2026-10-20T00:00:00+07:00',
      endAt: '2026-10-21T00:00:00+07:00',
      timezone: 'Asia/Ho_Chi_Minh',
      clientRequestId: draft.clientRequestId,
    });
  });

  it('restores only the versioned tab draft and clears it explicitly', () => {
    const draft = { ...emptyCreateTripDraft(), name: 'Miền Trung', description: 'Bản nháp' };
    writeCreateTripDraft(window.sessionStorage, draft);
    expect(readCreateTripDraft(window.sessionStorage)).toEqual(draft);
    clearCreateTripDraft(window.sessionStorage);
    expect(window.sessionStorage.getItem(CREATE_TRIP_DRAFT_KEY)).toBeNull();
    window.sessionStorage.setItem(CREATE_TRIP_DRAFT_KEY, JSON.stringify({ version: 0, name: 'old' }));
    expect(readCreateTripDraft(window.sessionStorage)).toBeNull();
  });
});

const activity = (id: string, locationId: string | null, startsAt = '2026-09-22T08:00:00+07:00'): ActivityViewModel => ({
  id, tripId: 'trip', title: `Activity ${id}`, description: null, publicDescription: null,
  activityType: 'WALK', selectedLocationId: locationId, startsAt, endsAt: null, position: 0,
  status: 'TODO', source: 'MANUAL', planVersion: 1, createdByUserId: 'user', completedByUserId: null,
  completedAt: null, presentation: { cover: null },
});
const location = (id: string, latitude: string | null, longitude: string | null): SelectedLocationViewModel => ({
  id, tripId: 'trip', name: `Location ${id}`, address: null, latitude, longitude, provider: null,
  providerPlaceId: null, source: 'MANUAL', openingHours: null, fetchedAt: null, metadata: {}, planVersion: 1,
});

describe('read-only Plan projection selectors', () => {
  it('groups dress code by trip, day and activity with a truthful missing-activity fallback', () => {
    const base = { tripId: 'trip', planDate: null, activityId: null, description: null, publicDescription: null, source: 'MANUAL' as const, planVersion: 1 };
    const items: DressCodeViewModel[] = [
      { ...base, id: '3', scopeType: 'ACTIVITY', activityId: 'missing', label: 'Missing' },
      { ...base, id: '2', scopeType: 'DAY', planDate: '2026-09-22', label: 'Day' },
      { ...base, id: '1', scopeType: 'TRIP', label: 'Trip' },
    ];
    const groups = groupDressCodes(items, []);
    expect(groups.map((group) => group.title)).toEqual(['Toàn chuyến đi', 'Ngày 22/09', 'Hoạt động không còn khả dụng']);
  });

  it('keeps exact packing quantities, puts null categories in Khác and counts projected status', () => {
    const base = { tripId: 'trip', unit: null, note: null, assignedMemberId: null, dueAt: null, source: 'MANUAL' as const, completedByUserId: null, completedAt: null, planVersion: 1 };
    const items: PackingItemViewModel[] = [
      { ...base, id: '1', name: 'Kem', quantity: '1.50', category: 'Cá nhân', status: 'COMPLETED' },
      { ...base, id: '2', name: 'Sạc', quantity: '1', category: null, status: 'TODO' },
    ];
    expect(groupPackingItems(items).at(-1)?.category).toBe('Khác');
    expect(groupPackingItems(items)[0]?.items[0]?.quantity).toBe('1.50');
    expect(packingProgress(items)).toEqual({ completed: 1, total: 2 });
  });

  it('validates coordinates without rounding and filters scheduled locations by Plan references', () => {
    const locations = [location('scheduled', '16.123456', '108.654321'), location('loose', null, null), location('bad', '91', '0')];
    const activities = [activity('a', 'scheduled')];
    expect(validCoordinates(locations[0]!)).toEqual({ latitude: 16.123456, longitude: 108.654321 });
    expect(validCoordinates(locations[2]!)).toBeNull();
    expect(selectMapLocations({ locations, activities, filter: 'SCHEDULED', day: null, timezone: 'Asia/Ho_Chi_Minh' }).map((item) => item.id)).toEqual(['scheduled']);
    expect(selectMapLocations({ locations, activities, filter: 'UNSCHEDULED', day: null, timezone: 'Asia/Ho_Chi_Minh' }).map((item) => item.id)).toEqual(['loose', 'bad']);
  });

  it('filters saved locations by Vietnamese text and formats schedule metadata', () => {
    const places = [
      { ...location('beach', '16.05', '108.24'), name: 'Bãi biển Mỹ Khê', address: 'Võ Nguyên Giáp, Sơn Trà' },
      { ...location('mountain', '16.0', '108.25'), name: 'Ngũ Hành Sơn' },
    ];
    const scheduled = {
      ...activity('beach-activity', 'beach'),
      startsAt: '2026-09-22T14:00:00+07:00',
      endsAt: '2026-09-22T16:30:00+07:00',
    };
    expect(selectMapLocations({ locations: places, activities: [scheduled], filter: 'ALL', day: null, timezone: 'Asia/Ho_Chi_Minh', query: 'mỹ khê' }).map((item) => item.id)).toEqual(['beach']);
    expect(selectMapLocations({ locations: places, activities: [scheduled], filter: 'ALL', day: null, timezone: 'Asia/Ho_Chi_Minh', query: 'võ nguyên giáp' }).map((item) => item.id)).toEqual(['beach']);
    expect(activityScheduleLabel(scheduled, 'Asia/Ho_Chi_Minh')).toBe('2026-09-22 · 14:00–16:30');
    expect(activityDurationLabel(scheduled)).toBe('2 giờ 30 phút');
  });
});
