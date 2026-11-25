import type {
  PreparationRecommendation,
  PreparationRecommendationItem,
  PreparationRecommendationsRepository,
} from '../../features/plan/model/preparation-recommendation';
import { ApiError } from '../http/api-error';
import * as d from '../http/decode';
import { toDomainError } from '../http/domain-error';
import type { GatewayHttpClient } from '../http/http-client';
import { validCalendarDate } from '../../shared/lib/calendar';

function invalid(): never {
  throw new ApiError(
    'Invalid recommendation response',
    'invalid-response',
    null,
    null,
    null,
    false,
  );
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : invalid();
}
function strings(value: unknown): string[] {
  return list(value).map(d.string);
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid();
}
function optionalText(value: unknown): string | null {
  return value == null ? null : d.string(value);
}
function itemId(value: unknown): string {
  return typeof value === 'string' && /^[0-9a-f]{24}$/.test(value) ? value : invalid();
}
function credit(value: unknown) {
  const raw = d.object(value);
  const url = d.string(raw.url);
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) invalid();
  return { text: d.string(raw.text), url };
}
export function decodePreparationRecommendation(
  value: unknown,
  tripId: string,
): PreparationRecommendation {
  const raw = d.object(value);
  d.scope(d.uuid(raw.trip_id), tripId);
  const items = list(raw.items).map((value): PreparationRecommendationItem => {
    const item = d.object(value);
    const kind = d.enumeration(item.kind, ['PACKING', 'DRESS_CODE']);
    const fields = d.object(kind === 'PACKING' ? item.packing_item : item.dress_code);
    const date = optionalText(item.date);
    if (date !== null && !validCalendarDate(date)) invalid();
    const quantity = kind === 'PACKING' ? d.string(fields.quantity) : null;
    if (quantity !== null && !/^\d{1,8}(?:\.\d{1,2})?$/.test(quantity)) invalid();
    return {
      id: itemId(item.id),
      kind,
      title: d.string(kind === 'PACKING' ? fields.name : fields.label),
      description: kind === 'DRESS_CODE' ? optionalText(fields.description) : null,
      quantity,
      unit: kind === 'PACKING' ? optionalText(fields.unit) : null,
      activityId: kind === 'DRESS_CODE' ? d.uuid(fields.activity_id) : null,
      date,
      reasons: strings(item.reasons),
      warnings: strings(item.warnings),
    };
  });
  if (items.length > 50 || new Set(items.map((item) => item.id)).size !== items.length) invalid();
  const status = d.enumeration(raw.status, ['PREVIEWED', 'APPLIED', 'REJECTED', 'EXPIRED']);
  const appliedPlanVersion =
    raw.applied_plan_version == null ? null : d.version(raw.applied_plan_version);
  const basePlanVersion = d.version(raw.base_plan_version);
  const applied = raw.applied == null ? null : d.object(raw.applied);
  if (
    status === 'APPLIED' &&
    (appliedPlanVersion === null || appliedPlanVersion < basePlanVersion || !applied)
  )
    invalid();
  if (applied) {
    const selected = strings(applied.item_ids);
    if (
      new Set(selected).size !== selected.length ||
      selected.some((id) => !items.some((item) => item.id === id))
    )
      invalid();
    for (const value of list(applied.created)) {
      const created = d.object(value);
      if (!selected.includes(itemId(created.item_id))) invalid();
      d.uuid(created.id);
      d.enumeration(created.entity_type, ['PACKING_ITEM', 'DRESS_CODE']);
    }
    for (const value of list(applied.skipped)) {
      const skipped = d.object(value);
      if (!selected.includes(itemId(skipped.item_id))) invalid();
      d.string(skipped.reason);
    }
  }
  return {
    id: d.uuid(raw.id),
    tripId,
    type: d.enumeration(raw.type, ['PACKING', 'DRESS_CODE', 'ALL']),
    status,
    basePlanVersion,
    appliedPlanVersion,
    expiresAt: d.instant(raw.expires_at),
    canApply: boolean(raw.can_apply),
    items,
    warnings: strings(raw.warnings),
    sources: list(raw.sources).map((value) => {
      const source = d.object(value);
      return {
        provider: d.string(source.provider),
        stale: boolean(source.stale),
        isMock: boolean(source.is_mock),
        attribution: list(source.attribution).map(credit),
      };
    }),
    applied: applied
      ? { createdCount: list(applied.created).length, skippedCount: list(applied.skipped).length }
      : null,
  };
}

export function createPreparationRecommendationsRepository(
  client: GatewayHttpClient,
): PreparationRecommendationsRepository {
  return {
    async preview({ tripId, type, date, activityIds, signal }) {
      const response = await client.write(
        `/api/v1/trips/${encodeURIComponent(tripId)}/recommendations`,
        {
          method: 'POST',
          body: {
            type,
            ...(date ? { date } : {}),
            ...(activityIds?.length ? { activity_ids: activityIds } : {}),
          },
          includeCredentials: true,
          signal,
        },
      );
      const result = decodePreparationRecommendation(response.data, tripId);
      if (result.type !== type) invalid();
      return result;
    },
    async apply({
      tripId,
      recommendationId,
      itemIds,
      expectedPlanVersion,
      idempotencyKey,
      signal,
    }) {
      try {
        const response = await client.write(
          `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/apply`,
          {
            method: 'POST',
            body: { item_ids: [...itemIds], expected_plan_version: expectedPlanVersion },
            idempotencyKey,
            includeCredentials: true,
            signal,
          },
        );
        const result = decodePreparationRecommendation(response.data, tripId);
        if (
          result.id !== recommendationId ||
          result.status !== 'APPLIED' ||
          result.basePlanVersion !== expectedPlanVersion
        )
          invalid();
        const appliedIds = strings(d.object(d.object(response.data).applied).item_ids);
        if (appliedIds.length !== itemIds.length || itemIds.some((id) => !appliedIds.includes(id)))
          invalid();
        return { status: 'success', data: result, correlationId: response.correlationId };
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        return { status: 'error', error: toDomainError(error) };
      }
    },
    async ignore({ tripId, recommendationId, signal }) {
      const response = await client.write(
        `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/ignore`,
        {
          method: 'POST',
          body: {},
          includeCredentials: true,
          signal,
        },
      );
      const result = decodePreparationRecommendation(response.data, tripId);
      if (result.id !== recommendationId || !['REJECTED', 'EXPIRED'].includes(result.status))
        invalid();
      return result;
    },
  };
}
