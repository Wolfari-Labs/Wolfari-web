import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createBrowserPushService } from '../src/infrastructure/push/browser-push-service';
import { createDeviceRepository } from '../src/infrastructure/repositories/device.gateway-repository';
import { withPushCleanup } from '../src/infrastructure/session/push-session';
import type { PushAdapter } from '../src/infrastructure/push/firebase-browser-adapter';
import type { GatewayHttpClient } from '../src/infrastructure/http/http-client';
import type { SessionManager } from '../src/infrastructure/session/session-manager';
const actor = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222',
  device = '33333333-3333-4333-8333-333333333333';
function setup(configured = true, permission: NotificationPermission = 'granted') {
  const adapter: PushAdapter = {
    configured,
    supported: vi.fn().mockResolvedValue(true),
    permission: () => permission,
    requestPermission: vi.fn().mockResolvedValue('granted'),
    token: vi.fn().mockResolvedValue('test-token-not-real'),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  const devices = {
    register: vi.fn().mockResolvedValue(device),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const service = createBrowserPushService(adapter, devices, () => localStorage);
  return { adapter, devices, service };
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('does not request permission or token when config is missing or unsupported', async () => {
  const missing = setup(false);
  missing.service.activate(actor);
  await missing.service.enable(actor);
  expect(missing.service.getSnapshot().state).toBe('missing-config');
  expect(missing.adapter.token).not.toHaveBeenCalled();
  const unsupported = setup();
  vi.mocked(unsupported.adapter.supported).mockResolvedValue(false);
  unsupported.service.activate(actor);
  await vi.waitFor(() => expect(unsupported.service.getSnapshot().state).toBe('unsupported'));
  await unsupported.service.enable(actor);
  expect(unsupported.adapter.requestPermission).not.toHaveBeenCalled();
});
it('asks only on explicit enable and prevents double-click duplicate registration', async () => {
  const { service, adapter, devices } = setup(true, 'default');
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().busy).toBe(false));
  expect(adapter.requestPermission).not.toHaveBeenCalled();
  await Promise.all([service.enable(actor), service.enable(actor)]);
  expect(devices.register).toHaveBeenCalledTimes(1);
  expect(service.getSnapshot().state).toBe('registered');
  expect(localStorage.getItem('wolfari:browser-push:v1')).not.toContain('test-token');
});
it('represents denied permission without registering', async () => {
  const { service, adapter, devices } = setup(true, 'default');
  vi.mocked(adapter.requestPermission).mockResolvedValue('denied');
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().busy).toBe(false));
  await service.enable(actor);
  expect(service.getSnapshot().state).toBe('denied');
  expect(devices.register).not.toHaveBeenCalled();
});
it('refreshes after reload and removes the old device when token rotation produces a new device', async () => {
  localStorage.setItem(
    'wolfari:browser-push:v1',
    JSON.stringify({ actor, id: device, enabled: true }),
  );
  const { service, devices } = setup();
  devices.register.mockResolvedValue(other);
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().state).toBe('registered'));
  expect(devices.remove).toHaveBeenCalledWith(device, expect.any(AbortSignal));
  expect(JSON.parse(localStorage.getItem('wolfari:browser-push:v1')!).id).toBe(other);
});
it('revokes local token even if server deletion fails and retains retry information', async () => {
  const { service, adapter, devices } = setup();
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().busy).toBe(false));
  await service.enable(actor);
  devices.remove.mockRejectedValue(new Error('offline'));
  await service.disconnect();
  expect(adapter.revoke).toHaveBeenCalled();
  expect(service.getSnapshot().state).toBe('error');
  expect(JSON.parse(localStorage.getItem('wolfari:browser-push:v1')!).enabled).toBe(false);
  devices.remove.mockResolvedValue(undefined);
  await service.disconnect();
  expect(localStorage.getItem('wolfari:browser-push:v1')).toBeNull();
});
it('does not register a token obtained after a session boundary changed', async () => {
  const { service, adapter, devices } = setup();
  let resolve!: (value: string) => void;
  vi.mocked(adapter.token).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().busy).toBe(false));
  const pending = service.enable(actor);
  await vi.waitFor(() => expect(adapter.token).toHaveBeenCalled());
  localStorage.setItem('wolfari:session-boundary:v1', 'other-tab-logout');
  service.suspend();
  resolve('late-token');
  await pending;
  expect(devices.register).not.toHaveBeenCalled();
  expect(adapter.revoke).toHaveBeenCalled();
});
it('does not silently reuse another account token', async () => {
  localStorage.setItem(
    'wolfari:browser-push:v1',
    JSON.stringify({ actor: other, id: device, enabled: true }),
  );
  const { service, adapter, devices } = setup();
  service.activate(actor);
  await vi.waitFor(() => expect(service.getSnapshot().busy).toBe(false));
  expect(devices.register).not.toHaveBeenCalled();
  await service.enable(actor);
  expect(adapter.revoke).toHaveBeenCalledBefore(vi.mocked(adapter.token));
});
it('uses exact WEB registration and bodyless DELETE contracts', async () => {
  const client = {
    read: vi.fn<GatewayHttpClient['read']>(),
    write: vi.fn<GatewayHttpClient['write']>(),
  };
  client.write.mockResolvedValueOnce({
    status: 200,
    correlationId: null,
    data: { id: device, platform: 'WEB', active: true, last_seen_at: '2026-11-21T00:00:00Z' },
  });
  const repository = createDeviceRepository(client),
    signal = new AbortController().signal;
  expect(await repository.register('test-token', signal)).toBe(device);
  expect(client.write).toHaveBeenCalledWith(
    '/api/v1/me/devices',
    expect.objectContaining({ body: { platform: 'WEB', token: 'test-token' } }),
  );
  client.write.mockResolvedValueOnce({ status: 204, correlationId: null, data: null });
  await repository.remove(device, signal);
  expect(client.write.mock.calls[1]?.[1]).not.toHaveProperty('body');
});
it('bounds cleanup so offline push cannot block logout indefinitely', async () => {
  vi.useFakeTimers();
  const { service } = setup();
  vi.spyOn(service, 'disconnect').mockImplementation(() => new Promise(() => undefined));
  const logout = vi.fn().mockResolvedValue(undefined);
  const manager = withPushCleanup({ logout } as unknown as SessionManager, service);
  const pending = manager.logout();
  await vi.advanceTimersByTimeAsync(8000);
  await pending;
  expect(logout).toHaveBeenCalledOnce();
});
it('recovers a lost registration response before removing the device', async () => {
  localStorage.setItem(
    'wolfari:browser-push:v1',
    JSON.stringify({ actor, id: null, enabled: true }),
  );
  const { service, adapter, devices } = setup();
  await service.disconnect();
  expect(devices.register).toHaveBeenCalledOnce();
  expect(devices.remove).toHaveBeenCalledWith(device, expect.any(AbortSignal));
  expect(adapter.revoke).toHaveBeenCalled();
  expect(localStorage.getItem('wolfari:browser-push:v1')).toBeNull();
});
