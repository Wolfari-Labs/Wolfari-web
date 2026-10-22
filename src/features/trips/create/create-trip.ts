import type { CreateTripIntent } from '../repositories/trip.repository';
import { createStorageFallback } from '../../../shared/lib/browser-storage';

export const CREATE_TRIP_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const CREATE_TRIP_DRAFT_KEY = 'wolfari:create-trip:v2';
const LEGACY_CREATE_TRIP_DRAFT_KEY = 'wolfari:create-trip:v1';
const drafts = createStorageFallback();

export type TripStyle = 'explore' | 'relax' | 'food' | 'culture';
export type TripTemplate = 'blank' | 'balanced' | 'discovery';
export type TripCover = 'cover-1' | 'cover-2' | 'cover-3' | 'custom';

export interface CreateTripDraftV2 {
  readonly version: 2;
  readonly clientRequestId: string;
  readonly name: string;
  readonly destination: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly timezone: string;
  readonly expectedMembers: number;
  readonly style: TripStyle | null;
  readonly budget: string;
  readonly template: TripTemplate;
  readonly cover: TripCover;
}

export type CreateTripDraftField = 'name' | 'destination' | 'startDate' | 'endDate';
export type CreateTripErrors = Partial<Record<CreateTripDraftField, string>>;

function createClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const emptyCreateTripDraft = (): CreateTripDraftV2 => ({
  version: 2,
  clientRequestId: createClientRequestId(),
  name: '',
  destination: '',
  description: '',
  startDate: '',
  endDate: '',
  timezone: CREATE_TRIP_TIMEZONE,
  expectedMembers: 1,
  style: null,
  budget: '',
  template: 'blank',
  cover: 'cover-1',
});

export function validateCreateTripDraft(draft: CreateTripDraftV2): CreateTripErrors {
  const errors: CreateTripErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Vui lòng nhập tên chuyến đi.';
  else if (name.length > 200) errors.name = 'Tên chuyến đi không được vượt quá 200 ký tự.';
  if (!draft.destination.trim()) errors.destination = 'Vui lòng chọn điểm đến chính.';
  if (!draft.startDate) errors.startDate = 'Vui lòng chọn ngày đi.';
  if (!draft.endDate) errors.endDate = 'Vui lòng chọn ngày về.';
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.endDate = 'Ngày về không thể trước ngày đi.';
  }
  return errors;
}

function addOneDay(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('Invalid date-only value');
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return next.toISOString().slice(0, 10);
}

/** UI dates are inclusive; the write contract stores an exclusive end instant. */
export function createTripIntentFromDraft(draft: CreateTripDraftV2): CreateTripIntent {
  const description = draft.description.trim();
  return {
    name: draft.name.trim(),
    ...(description ? { description } : {}),
    startAt: `${draft.startDate}T00:00:00+07:00`,
    endAt: `${addOneDay(draft.endDate)}T00:00:00+07:00`,
    timezone: CREATE_TRIP_TIMEZONE,
    clientRequestId: draft.clientRequestId,
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isV2Draft(value: unknown): value is CreateTripDraftV2 {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CreateTripDraftV2>;
  return (
    draft.version === 2 &&
    [draft.clientRequestId, draft.name, draft.destination, draft.description, draft.startDate, draft.endDate, draft.timezone, draft.budget].every(isString) &&
    Number.isInteger(draft.expectedMembers) &&
    Number(draft.expectedMembers) >= 1 &&
    Number(draft.expectedMembers) <= 6 &&
    (draft.style === null || ['explore', 'relax', 'food', 'culture'].includes(draft.style ?? '')) &&
    ['blank', 'balanced', 'discovery'].includes(draft.template ?? '') &&
    ['cover-1', 'cover-2', 'cover-3', 'custom'].includes(draft.cover ?? '')
  );
}

export function readCreateTripDraft(storage: Storage | null): CreateTripDraftV2 | null {
  try {
    const parsed = JSON.parse(drafts.read(storage, CREATE_TRIP_DRAFT_KEY).raw ?? 'null') as unknown;
    if (isV2Draft(parsed)) return { ...parsed, timezone: CREATE_TRIP_TIMEZONE };

    const legacy = JSON.parse(drafts.read(storage, LEGACY_CREATE_TRIP_DRAFT_KEY).raw ?? 'null') as Record<string, unknown> | null;
    if (!legacy || legacy.version !== 1) return null;
    if (![legacy.name, legacy.description, legacy.startDate, legacy.endDate].every(isString)) return null;
    return {
      ...emptyCreateTripDraft(),
      name: legacy.name as string,
      description: legacy.description as string,
      startDate: legacy.startDate as string,
      endDate: legacy.endDate as string,
    };
  } catch {
    return null;
  }
}

export function writeCreateTripDraft(storage: Storage | null, draft: CreateTripDraftV2) {
  return drafts.write(storage, CREATE_TRIP_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCreateTripDraft(storage: Storage | null) {
  const current = drafts.write(storage, CREATE_TRIP_DRAFT_KEY, null);
  const legacy = drafts.write(storage, LEGACY_CREATE_TRIP_DRAFT_KEY, null);
  return current === 'saved' && legacy === 'saved' ? 'saved' : 'memory';
}
