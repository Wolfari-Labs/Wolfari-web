export interface GatewayMetadata {
  exportRevision?: number;
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
  if (revision !== undefined && (!Number.isSafeInteger(revision) || (revision as number) < 1)) {
    throw new Error('Invalid export revision');
  }
  if (hasData)
    return {
      kind: 'success',
      data: value.data,
      correlationId,
      metadata: revision === undefined ? {} : { exportRevision: revision as number },
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
