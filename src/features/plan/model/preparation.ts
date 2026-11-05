import { validCalendarDate } from '../../../shared/lib/calendar';
import type { PackingItemViewModel, PlanViewModel } from './plan';
import type { TripDetailViewModel } from '../../trips/model/trip-detail';

export const preparationCapabilities = [
  'locations_write',
  'dress_codes_write',
  'packing_items_write',
  'packing_assignment',
  'packing_completion',
  'place_search',
  'routes',
  'route_order_request',
  'route_order_apply',
  'packing_dress_request',
  'packing_dress_apply',
  'schedule_validation',
] as const;
export type PreparationCapability = (typeof preparationCapabilities)[number];
export type PlanCapabilities = Partial<Record<PreparationCapability, boolean>>;
export interface LocationWrite {
  name: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  provider?: string | null;
  providerPlaceId?: string | null;
  openingHours?: unknown;
  fetchedAt?: string | null;
}
export interface DressWrite {
  scopeType: 'DAY' | 'ACTIVITY';
  planDate: string | null;
  activityId: string | null;
  label: string;
  description: string | null;
  publicDescription: string | null;
}
export interface PackingWrite {
  name: string;
  quantity: string;
  unit: string | null;
  category: string | null;
  note: string | null;
  dueAt: string | null;
}
export type PreparationIntent =
  | { operation: 'location-create'; fields: LocationWrite }
  | { operation: 'location-update'; id: string; fields: LocationWrite }
  | { operation: 'location-delete'; id: string }
  | { operation: 'dress-create'; fields: DressWrite }
  | { operation: 'dress-update'; id: string; fields: DressWrite }
  | { operation: 'dress-delete'; id: string }
  | { operation: 'packing-create'; fields: PackingWrite }
  | { operation: 'packing-update'; id: string; fields: PackingWrite }
  | { operation: 'packing-delete'; id: string }
  | { operation: 'packing-assignment'; id: string; assignedMemberId: string | null }
  | { operation: 'packing-completion'; id: string; status: 'TODO' | 'COMPLETED' }
  | {
      operation: 'recommendation-apply';
      id: string;
      selectedItemIds: string[];
      basePlanVersion: number;
    };

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && !!v.trim() && v.length <= max;
const nullable = (v: unknown, max = 10000) =>
  v === null || (typeof v === 'string' && v.length <= max);
const id = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
export function validLocationWrite(v: unknown): v is LocationWrite {
  if (
    !obj(v) ||
    !keys(v, [
      'name',
      'address',
      'latitude',
      'longitude',
      'provider',
      'providerPlaceId',
      'openingHours',
      'fetchedAt',
    ]) ||
    !text(v.name, 255) ||
    !nullable(v.address)
  )
    return false;
  const coordinate = (n: unknown, max: number) =>
    typeof n === 'string' && /^-?\d+(?:\.\d{1,6})?$/.test(n) && Math.abs(Number(n)) <= max;
  return (
    ((v.latitude === null && v.longitude === null) ||
      (coordinate(v.latitude, 90) && coordinate(v.longitude, 180))) &&
    (v.provider === undefined || nullable(v.provider, 100)) &&
    (v.providerPlaceId === undefined || nullable(v.providerPlaceId, 255)) &&
    (v.fetchedAt === undefined ||
      v.fetchedAt === null ||
      (typeof v.fetchedAt === 'string' && Number.isFinite(Date.parse(v.fetchedAt))))
  );
}
export function validDressWrite(v: unknown): v is DressWrite {
  return (
    obj(v) &&
    keys(v, ['scopeType', 'planDate', 'activityId', 'label', 'description', 'publicDescription']) &&
    text(v.label, 100) &&
    nullable(v.description) &&
    nullable(v.publicDescription) &&
    ((v.scopeType === 'DAY' &&
      typeof v.planDate === 'string' &&
      validCalendarDate(v.planDate) &&
      v.activityId === null) ||
      (v.scopeType === 'ACTIVITY' && id(v.activityId) && v.planDate === null))
  );
}
export function validPackingWrite(v: unknown): v is PackingWrite {
  return (
    obj(v) &&
    keys(v, ['name', 'quantity', 'unit', 'category', 'note', 'dueAt']) &&
    text(v.name, 200) &&
    validPackingQuantity(v.quantity) &&
    nullable(v.unit, 30) &&
    nullable(v.category, 80) &&
    nullable(v.note, 500) &&
    (v.dueAt === null || (typeof v.dueAt === 'string' && Number.isFinite(Date.parse(v.dueAt))))
  );
}
export function validPackingQuantity(value: unknown) {
  return (
    typeof value === 'string' &&
    /^\d+(?:\.\d{1,2})?$/.test(value) &&
    Number(value) > 0 &&
    Number(value) <= 99999999.99
  );
}
/** Storage is untrusted. Only reconstruct closed, validated commands; never stored paths. */
export function parsePreparationIntent(value: unknown): PreparationIntent | null {
  if (!obj(value) || typeof value.operation !== 'string') return null;
  const op = value.operation;
  if (op === 'recommendation-apply') {
    if (
      !keys(value, ['operation', 'id', 'selectedItemIds', 'basePlanVersion']) ||
      !id(value.id) ||
      !Array.isArray(value.selectedItemIds) ||
      !value.selectedItemIds.length ||
      !value.selectedItemIds.every((v) => text(v, 255)) ||
      new Set(value.selectedItemIds).size !== value.selectedItemIds.length ||
      !Number.isSafeInteger(value.basePlanVersion) ||
      Number(value.basePlanVersion) < 1
    )
      return null;
  } else if (op === 'packing-assignment') {
    if (
      !keys(value, ['operation', 'id', 'assignedMemberId']) ||
      !id(value.id) ||
      !(value.assignedMemberId === null || id(value.assignedMemberId))
    )
      return null;
  } else if (op === 'packing-completion') {
    if (
      !keys(value, ['operation', 'id', 'status']) ||
      !id(value.id) ||
      !['TODO', 'COMPLETED'].includes(String(value.status))
    )
      return null;
  } else {
    if (!/^(location|dress|packing)-(create|update|delete)$/.test(op)) return null;
    const create = op.endsWith('-create'),
      remove = op.endsWith('-delete');
    if (
      !keys(value, ['operation', ...(create ? [] : ['id']), ...(remove ? [] : ['fields'])]) ||
      (!create && !id(value.id))
    )
      return null;
    if (
      !remove &&
      !(op.startsWith('location-')
        ? validLocationWrite(value.fields)
        : op.startsWith('dress-')
          ? validDressWrite(value.fields)
          : validPackingWrite(value.fields))
    )
      return null;
  }
  return JSON.parse(JSON.stringify(value)) as PreparationIntent;
}
export function activePlan(trip: TripDetailViewModel) {
  return (
    trip.currentMembership.leftAt === null &&
    trip.archivedAt === null &&
    trip.lifecycle !== 'ARCHIVED'
  );
}
export function canTogglePacking(
  trip: TripDetailViewModel,
  plan: PlanViewModel,
  item: PackingItemViewModel,
) {
  return (
    activePlan(trip) &&
    (plan.permissions.canEdit || item.assignedMemberId === trip.currentMembership.id)
  );
}
export function packingRequiresReset(
  before: PackingItemViewModel,
  after: Pick<PackingItemViewModel, 'name' | 'quantity' | 'assignedMemberId'>,
) {
  return (
    before.name !== after.name ||
    Number(before.quantity) !== Number(after.quantity) ||
    before.assignedMemberId !== after.assignedMemberId
  );
}
