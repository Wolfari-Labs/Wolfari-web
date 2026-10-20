import { describe, expect, it, vi } from 'vitest';
import {
  createFixtureShellRepository,
  previewTripId,
} from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createGatewayShellRepository } from '../src/infrastructure/repositories/shell.gateway-repository';
import { selectShellRepository } from '../src/infrastructure/repositories/select-shell-repository';
import type { ShellRepository } from '../src/features/shell/repositories/shell.repository';

function request(scenario: Parameters<ShellRepository['read']>[0]['scenario'] = 'success') {
  return { tripId: previewTripId, scenario, signal: new AbortController().signal };
}
describe('Shell repository boundary', () => {
  it('does not create a trip projection or grant permissions just from a route ID', async () => {
    expect(
      await createFixtureShellRepository().read({
        ...request(),
        tripId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toMatchObject({ status: 'error', error: { code: 'RESOURCE_NOT_FOUND' } });
  });
  it('Admin is an explicit fixture identity role and never grants Trip read/write rights', async () => {
    const result = await createFixtureShellRepository().read(request('admin'));
    expect(result).toMatchObject({
      status: 'ready',
      data: {
        viewer: { systemRole: 'ADMIN', version: 1 },
        trip: { permissions: { canRead: false, canUpdate: false } },
      },
    });
    const denied = await createFixtureShellRepository().read(request('forbidden-snapshot'));
    expect(denied).toMatchObject({
      status: 'ready',
      data: { trip: { permissions: { canRead: false } } },
    });
  });
  it('fixture preserves revisions and read permission without granting write permission', async () => {
    const result = await createFixtureShellRepository().read(request());
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected fixture');
    expect(result.data.viewer?.version).toBe(1);
    expect(result.data.trip).toMatchObject({
      planVersion: 1,
      membershipRevision: 1,
      exportRevision: 1,
      permissions: { canRead: true, canUpdate: false },
    });
    expect(Object.keys(createFixtureShellRepository())).toEqual(['read']);
  });
  it.each([
    ['forbidden', 'PERMISSION_DENIED'],
    ['not-found', 'RESOURCE_NOT_FOUND'],
    ['conflict', 'VERSION_CONFLICT'],
    ['unavailable', 'SERVICE_UNAVAILABLE'],
  ] as const)('keeps %s error evidence', async (scenario, code) => {
    expect(await createFixtureShellRepository().read(request(scenario))).toEqual({
      status: 'error',
      error: { code, correlationId: 'fixture-app-shell', retryable: false },
    });
  });
  it('represents empty and guest without fabricating membership', async () => {
    const repository = createFixtureShellRepository();
    expect(await repository.read(request('empty'))).toEqual({ status: 'empty' });
    expect(await repository.read(request('guest'))).toEqual({
      status: 'ready',
      data: { viewer: null, trip: null },
    });
  });
  it('cancels the loading scenario when the query context goes away', async () => {
    const controller = new AbortController();
    const pending = createFixtureShellRepository().read({
      ...request('loading'),
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('both adapters satisfy the same read interface and Gateway forwards cancellation', async () => {
    const fixture: ShellRepository = createFixtureShellRepository();
    const reader = vi.fn(async (input) => fixture.read(input));
    const gateway: ShellRepository = createGatewayShellRepository(reader);
    const input = request();
    expect(await gateway.read(input)).toEqual(await fixture.read(input));
    expect(reader).toHaveBeenCalledWith(input);
  });
  it('composes the verified profile and trip projections through the shared Gateway client', async () => {
    const input = request();
    const client = {
      read: vi.fn(async (path: string) => {
        if (path === '/api/v1/me')
          return {
            data: {
              full_name: 'Gateway user',
              version: 7,
              system_role: 'USER',
            },
            correlationId: 'profile-read',
          };
        return {
          data: {
            id: previewTripId,
            plan_version: 3,
            membership_revision: 4,
            export_revision: 5,
            permissions: { can_read: true, can_update: false },
          },
          correlationId: 'trip-read',
        };
      }),
    };
    const result = await createGatewayShellRepository(undefined, client).read(input);
    expect(result).toEqual({
      status: 'ready',
      data: {
        viewer: { fullName: 'Gateway user', version: 7, systemRole: 'USER' },
        trip: {
          id: previewTripId,
          planVersion: 3,
          membershipRevision: 4,
          exportRevision: 5,
          permissions: { canRead: true, canUpdate: false },
        },
      },
    });
    expect(client.read).toHaveBeenNthCalledWith(1, '/api/v1/me', {
      signal: input.signal,
      includeCredentials: true,
    });
    expect(client.read).toHaveBeenNthCalledWith(2, `/api/v1/trips/${previewTripId}`, {
      signal: input.signal,
      includeCredentials: true,
    });
  });
  it('does not call the Gateway for a guest shell route', async () => {
    const client = { read: vi.fn() };
    expect(
      await createGatewayShellRepository(undefined, client).read(request('guest')),
    ).toEqual({ status: 'ready', data: { viewer: null, trip: null } });
    expect(client.read).not.toHaveBeenCalled();
  });
  it('unconfigured Gateway reports unavailable and sends no requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await createGatewayShellRepository().read(request())).toEqual({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('blocks fixture in production and rejects unknown data modes', async () => {
    await expect(selectShellRepository('fixture', false)).rejects.toThrow('Fixture requires');
    await expect(selectShellRepository('invented', true)).rejects.toThrow('Invalid data mode');
    expect(await (await selectShellRepository(undefined, false)).read(request())).toMatchObject({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
  });
});
