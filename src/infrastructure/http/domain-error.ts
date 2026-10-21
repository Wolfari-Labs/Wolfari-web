import type { DomainError } from '../../shared/types/result';
import { ApiError } from './api-error';

const codes: ReadonlySet<DomainError['code']> = new Set([
  'UNAUTHENTICATED',
  'VALIDATION_FAILED',
  'PERMISSION_DENIED',
  'RESOURCE_NOT_FOUND',
  'VERSION_CONFLICT',
  'STATE_CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'RESOURCE_EXHAUSTED',
  'FINANCE_OBLIGATION_BLOCKED',
  'SERVICE_UNAVAILABLE',
]);

export function toDomainError(error: unknown): DomainError {
  const api = error instanceof ApiError ? error : null;
  const code = api?.code && codes.has(api.code as DomainError['code'])
    ? (api.code as DomainError['code'])
    : api?.status === 401
      ? 'UNAUTHENTICATED'
      : api?.status === 400
        ? 'VALIDATION_FAILED'
        : api?.status === 403
          ? 'PERMISSION_DENIED'
          : api?.status === 404
            ? 'RESOURCE_NOT_FOUND'
            : api?.status === 409
              ? 'STATE_CONFLICT'
              : api?.status === 429
                ? 'RESOURCE_EXHAUSTED'
                : 'SERVICE_UNAVAILABLE';
  return {
    code,
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
    details: api?.details ?? null,
  };
}

