import type { ShellRepository } from '../../features/shell/repositories/shell.repository';
import type { ShellSnapshot } from '../../features/shell/model/shell';
import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import type { DomainError } from '../../shared/types/result';

// The Gateway exposes Identity and Trip projections separately; the shell adapter
// composes those read-only projections without inventing a /shell endpoint.
export type GatewayShellReader = ShellRepository['read'];

function domainError(error: unknown): DomainError {
  const api = error instanceof ApiError ? error : null;
  const code = api?.code;
  return {
    code:
      code === 'PERMISSION_DENIED' || code === 'RESOURCE_NOT_FOUND' || code === 'VERSION_CONFLICT'
        ? code
        : ('SERVICE_UNAVAILABLE' as const),
    correlationId: api?.correlationId ?? null,
    retryable: api?.retryable ?? true,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapViewer(raw: unknown): ShellSnapshot['viewer'] {
  const profile = record(raw);
  const fullName = profile?.full_name;
  const version = number(profile?.version);
  const systemRole = profile?.system_role;
  if (
    typeof fullName !== 'string' ||
    version === null ||
    (systemRole !== 'USER' && systemRole !== 'ADMIN')
  ) {
    throw new Error('Invalid Gateway profile projection');
  }
  return { fullName, version, systemRole };
}

function mapTrip(raw: unknown): NonNullable<ShellSnapshot['trip']> {
  const trip = record(raw);
  const id = trip?.id;
  const planVersion = number(trip?.plan_version);
  const membershipRevision = number(trip?.membership_revision);
  const exportRevision = number(trip?.export_revision);
  const permissions = record(trip?.permissions);
  if (
    typeof id !== 'string' ||
    planVersion === null ||
    membershipRevision === null ||
    exportRevision === null ||
    !permissions
  ) {
    throw new Error('Invalid Gateway trip projection');
  }
  return {
    id,
    planVersion,
    membershipRevision,
    exportRevision,
    permissions: {
      canRead: permissions.can_read === true,
      canUpdate: permissions.can_update === true,
    },
  };
}

export function createGatewayShellRepository(
  reader?: GatewayShellReader,
  client?: Pick<GatewayHttpClient, 'read'>,
): ShellRepository {
  return {
    read:
      reader ??
      (async ({ tripId, scenario, signal }) => {
        signal.throwIfAborted();
        // Guest routes deliberately avoid a profile request. This keeps public
        // pages usable when the browser has no authenticated session.
        if (scenario === 'guest') return { status: 'ready', data: { viewer: null, trip: null } };
        if (!client) {
          return {
            status: 'error',
            error: {
              code: 'SERVICE_UNAVAILABLE',
              correlationId: null,
              retryable: false,
            },
          };
        }
        try {
          const profile = await client.read('/api/v1/me', {
            signal,
            includeCredentials: true,
          });
          const trip = tripId
            ? await client.read(`/api/v1/trips/${encodeURIComponent(tripId)}`, {
                signal,
                includeCredentials: true,
              })
            : null;
          return {
            status: 'ready' as const,
            data: {
              viewer: mapViewer(profile.data),
              trip: trip ? mapTrip(trip.data) : null,
            },
          };
        } catch (error) {
          if (signal.aborted) throw signal.reason;
          return { status: 'error' as const, error: domainError(error) };
        }
      }),
  };
}
