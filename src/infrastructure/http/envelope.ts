export interface GatewayMetadata {
  travelSource?: {
    provider: string;
    status: 'SUCCESS' | 'NO_RESULT';
    fetchedAt: string | null;
    stale: boolean;
    isMock: boolean;
    warnings: string[];
    attribution: { text: string; url: string | null }[];
  };
  exportRevision?: number;
  nextCursor?: string | null;
  priceSource?: {
    stale: boolean;
    lastError: string | null;
    lastCheckedAt?: string | null;
    nextCheckAt?: string | null;
    lastCheckStatus?: string | null;
  };
  placesSource?: {
    /** `GEOAPIFY`, `WOLFARI` or `WOLFARI+GEOAPIFY` (curated store first, provider appended). */
    provider: string;
    status: string;
    stale: boolean;
    fetchedAt: string | null;
    warnings: string[];
    /** POI-OVERTURE §2.1 additive meta; absent on older backends. */
    snapshotId?: string | null;
    dataRelease?: string | null;
    bboxTruncated?: boolean;
  };
}
export type GatewayEnvelope =
  | { kind: 'success'; data: unknown; correlationId: string | null; metadata: GatewayMetadata }
  | {
      kind: 'error';
      code: string;
      message: string;
      retryable: boolean;
      details: unknown;
      correlationId: string | null;
    };

const PLACES_PROVIDERS = new Set(['GEOAPIFY', 'WOLFARI', 'WOLFARI+GEOAPIFY']);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseEnvelope(value: unknown): GatewayEnvelope {
  if (!record(value) || !record(value.meta)) throw new Error('Invalid Gateway envelope');
  const correlation = value.meta.correlation_id;
  if (correlation !== undefined && correlation !== null && typeof correlation !== 'string') {
    throw new Error('Invalid correlation ID');
  }
  const correlationId = typeof correlation === 'string' ? correlation : null;
  const hasData = Object.hasOwn(value, 'data');
  const hasError = Object.hasOwn(value, 'error');
  if (hasData === hasError) throw new Error('Ambiguous Gateway envelope');
  const revision = value.meta.export_revision;
  const cursor = value.meta.next_cursor;
  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string')
    throw new Error('Invalid next cursor');
  if (revision !== undefined && (!Number.isSafeInteger(revision) || (revision as number) < 1)) {
    throw new Error('Invalid export revision');
  }
  if (hasData)
    return {
      kind: 'success',
      data: value.data,
      correlationId,
      metadata: {
        ...(typeof value.meta.provider === 'string' &&
        value.meta.provider.trim() &&
        (value.meta.status === 'SUCCESS' || value.meta.status === 'NO_RESULT') &&
        typeof value.meta.stale === 'boolean' &&
        typeof value.meta.is_mock === 'boolean'
          ? {
              travelSource: {
                provider: value.meta.provider,
                status: value.meta.status,
                fetchedAt:
                  typeof value.meta.fetched_at === 'string' &&
                  Number.isFinite(Date.parse(value.meta.fetched_at))
                    ? value.meta.fetched_at
                    : null,
                stale: value.meta.stale,
                isMock: value.meta.is_mock,
                warnings: Array.isArray(value.meta.warnings)
                  ? value.meta.warnings.filter((item): item is string => typeof item === 'string')
                  : [],
                attribution: Array.isArray(value.meta.attribution)
                  ? value.meta.attribution.flatMap((item) =>
                      record(item) && typeof item.text === 'string' && item.text.trim()
                        ? [
                            {
                              text: item.text,
                              url:
                                typeof item.url === 'string' && /^https:\/\/[^\s]+$/.test(item.url)
                                  ? item.url
                                  : null,
                            },
                          ]
                        : [],
                    )
                  : [],
              },
            }
          : {}),
        ...(typeof value.meta.provider === 'string' &&
        PLACES_PROVIDERS.has(value.meta.provider) &&
        typeof value.meta.status === 'string'
          ? {
              placesSource: {
                provider: value.meta.provider,
                status: value.meta.status,
                stale: value.meta.stale === true,
                fetchedAt: typeof value.meta.fetched_at === 'string' ? value.meta.fetched_at : null,
                warnings: Array.isArray(value.meta.warnings)
                  ? value.meta.warnings.filter((v): v is string => typeof v === 'string')
                  : [],
                ...(typeof value.meta.snapshot_id === 'string'
                  ? { snapshotId: value.meta.snapshot_id }
                  : {}),
                ...(typeof value.meta.data_release === 'string'
                  ? { dataRelease: value.meta.data_release }
                  : {}),
                ...(typeof value.meta.bbox_truncated === 'boolean'
                  ? { bboxTruncated: value.meta.bbox_truncated }
                  : {}),
              },
            }
          : {}),
        ...(revision === undefined ? {} : { exportRevision: revision as number }),
        ...(cursor === undefined ? {} : { nextCursor: cursor as string | null }),
        ...(typeof value.meta.stale === 'boolean' &&
        (value.meta.last_error === null || typeof value.meta.last_error === 'string')
          ? {
              priceSource: {
                stale: value.meta.stale,
                lastError: value.meta.last_error,
                lastCheckedAt:
                  typeof value.meta.last_checked_at === 'string'
                    ? value.meta.last_checked_at
                    : null,
                nextCheckAt:
                  typeof value.meta.next_check_at === 'string' ? value.meta.next_check_at : null,
                lastCheckStatus:
                  typeof value.meta.last_check_status === 'string'
                    ? value.meta.last_check_status
                    : null,
              },
            }
          : {}),
      },
    };
  if (
    !record(value.error) ||
    typeof value.error.code !== 'string' ||
    typeof value.error.message !== 'string' ||
    typeof value.error.retryable !== 'boolean'
  ) {
    throw new Error('Invalid Gateway error');
  }
  return {
    kind: 'error',
    code: value.error.code,
    message: value.error.message,
    retryable: value.error.retryable,
    details: value.error.details ?? null,
    correlationId,
  };
}
