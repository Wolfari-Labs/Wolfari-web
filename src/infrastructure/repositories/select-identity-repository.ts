import type { IdentityRepository } from '../../features/auth/model/identity';
import { createGatewayIdentityRepository } from './identity.gateway-repository';
import type { GatewayHttpClient } from '../http/http-client';
import type { SessionManager } from '../session/session-manager';
export function selectIdentityRepository(
  mode: string | undefined,
  previewAllowed: boolean,
  factory?: () => IdentityRepository,
  client?: GatewayHttpClient,
  session?: SessionManager,
): IdentityRepository {
  const selected = mode ?? (previewAllowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw new Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayIdentityRepository(undefined, client, session);
  if (!previewAllowed || !factory)
    throw new Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
