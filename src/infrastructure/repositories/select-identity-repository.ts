import type { IdentityRepository } from '../../features/auth/model/identity';
import { createGatewayIdentityRepository } from './identity.gateway-repository';
export function selectIdentityRepository(
  mode: string | undefined,
  previewAllowed: boolean,
  factory?: () => IdentityRepository,
): IdentityRepository {
  const selected = mode ?? (previewAllowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw new Error('Invalid data mode');
  if (selected === 'gateway') return createGatewayIdentityRepository();
  if (!previewAllowed || !factory)
    throw new Error('Fixture requires development or explicit UI preview and factory');
  return factory();
}
