import type { ShellRepository } from '../../features/shell/repositories/shell.repository';
import { createGatewayShellRepository } from './shell.gateway-repository';
import type { GatewayHttpClient } from '../http/http-client';

export async function selectShellRepository(
  mode: string | undefined,
  previewAllowed: boolean,
  fixtureFactory?: () => ShellRepository,
  client?: GatewayHttpClient,
): Promise<ShellRepository> {
  const selected = mode ?? (previewAllowed ? 'fixture' : 'gateway');
  if (selected !== 'fixture' && selected !== 'gateway') throw new Error('Invalid data mode');
  if (selected === 'fixture') {
    if (!previewAllowed) throw new Error('Fixture requires development or explicit UI preview');
    if (!fixtureFactory) throw new Error('Fixture factory is missing');
    return fixtureFactory();
  }
  return createGatewayShellRepository(undefined, client);
}
