import type { BrowserPush, PushSnapshot } from '../../features/notifications/browser-push';
import type { DeviceRepository } from '../repositories/device.gateway-repository';
import type { PushAdapter } from './firebase-browser-adapter';
import { uuid } from '../http/decode';

type Registration = { actor: string; id: string | null; enabled: boolean };
const key = 'wolfari:browser-push:v1';
export function createBrowserPushService(
  adapter: PushAdapter,
  devices: DeviceRepository,
  storage: () => Storage,
): BrowserPush {
  let current: PushSnapshot = {
    state: adapter.configured ? 'idle' : 'missing-config',
    busy: false,
    message: '',
  };
  let actor: string | null = null,
    generation = 0;
  let controller: AbortController | null = null;
  let flight: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const update = (patch: Partial<PushSnapshot>) => {
    current = { ...current, ...patch };
    listeners.forEach((fn) => fn());
  };
  const read = (): Registration | null => {
    const value = storage().getItem(key);
    if (!value) return null;
    const row = JSON.parse(value) as Registration;
    uuid(row.actor);
    if (row.id !== null) uuid(row.id);
    if (typeof row.enabled !== 'boolean') throw Error('Invalid push registration');
    return row;
  };
  const save = (row: Registration | null) =>
    row ? storage().setItem(key, JSON.stringify(row)) : storage().removeItem(key);
  const serial = (work: () => Promise<void>) => {
    const next = flight
      .catch(() => undefined)
      .then(async () => {
        if (navigator.locks) await navigator.locks.request('wolfari:push-registration:v1', work);
        else await work();
      });
    flight = next;
    return next;
  };
  const boundary = () => storage().getItem('wolfari:session-boundary:v1');
  const register = (owner: string, started: number) =>
    serial(async () => {
      if (actor !== owner || started !== generation) return;
      controller = new AbortController();
      const signal = controller.signal;
      const epoch = boundary();
      const active = () =>
        !signal.aborted && generation === started && actor === owner && boundary() === epoch;
      try {
        const previous = read();
        if (previous && (previous.actor !== owner || !previous.enabled)) {
          await adapter.revoke();
          if (!active()) return;
          if (previous.actor === owner && previous.id) await devices.remove(previous.id, signal);
        }
        if (!active()) return;
        // Persist intent before requesting a token: lost registration responses remain recoverable.
        save({ actor: owner, id: previous?.actor === owner ? previous.id : null, enabled: true });
        const token = await adapter.token();
        if (!active()) {
          await adapter.revoke();
          return;
        }
        const id = await devices.register(token, signal);
        if (!active()) {
          await adapter.revoke();
          return;
        }
        if (previous?.actor === owner && previous.id && previous.id !== id)
          await devices.remove(previous.id, signal);
        if (!active()) {
          await adapter.revoke();
          return;
        }
        save({ actor: owner, id, enabled: true });
        update({
          state: 'registered',
          message: 'Đã đăng ký trình duyệt này. Việc gửi thông báo còn phụ thuộc cấu hình backend.',
        });
      } catch {
        if (active())
          update({
            state: 'error',
            message:
              'Chưa xác nhận đăng ký. Bấm cập nhật để đối chiếu lại cùng token; không cần cấp quyền lần nữa.',
          });
      } finally {
        if (started === generation) update({ busy: false });
      }
    });
  const service: BrowserPush = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => current,
    activate(owner) {
      if (owner === actor) return;
      actor = uuid(owner);
      const started = ++generation;
      controller?.abort();
      update({
        state: adapter.configured ? 'idle' : 'missing-config',
        busy: adapter.configured,
        message: '',
      });
      if (!adapter.configured) return;
      void adapter
        .supported()
        .then(async (supported) => {
          if (generation !== started) return;
          if (!supported) {
            update({ state: 'unsupported', busy: false });
            return;
          }
          if (adapter.permission() === 'denied') {
            update({ state: 'denied', busy: false });
            return;
          }
          const row = read();
          if (row?.actor === owner && row.enabled && adapter.permission() === 'granted') {
            update({ busy: true });
            await register(owner, started);
          } else update({ busy: false });
        })
        .catch(() => {
          if (generation === started)
            update({
              state: 'error',
              busy: false,
              message: 'Không thể truy cập bộ nhớ hoặc dịch vụ push của trình duyệt.',
            });
        });
    },
    async enable(owner) {
      if (actor !== owner || current.busy || !adapter.configured || current.state === 'unsupported')
        return;
      const started = generation;
      update({ busy: true, message: '' });
      try {
        // Permission prompt is called directly from the button gesture, before network work.
        const permission =
          adapter.permission() === 'granted' ? 'granted' : await adapter.requestPermission();
        if (started !== generation) return;
        if (permission !== 'granted') {
          update({ state: permission === 'denied' ? 'denied' : 'idle', busy: false });
          return;
        }
        await register(owner, started);
      } catch {
        if (started === generation)
          update({
            state: 'error',
            busy: false,
            message: 'Không thể bật thông báo trình duyệt. Kiểm tra quyền và thử lại.',
          });
      }
    },
    async disconnect() {
      const started = ++generation;
      controller?.abort();
      update({ busy: true });
      return serial(async () => {
        if (started !== generation) return;
        let failed = false;
        let row: Registration | null = null;
        try {
          row = read();
          if (row && !row.id && adapter.permission() === 'granted') {
            // Recover a lost POST response using the same SDK token before revocation.
            const token = await adapter.token();
            if (started !== generation) return;
            row = { ...row, id: await devices.register(token, AbortSignal.timeout(5000)) };
          }
          if (row && !row.id) failed = true;
          if (row) save({ ...row, enabled: false });
        } catch {
          failed = true;
        }
        // Local subscription is revoked even if the authenticated API deletion fails.
        try {
          await adapter.revoke();
        } catch {
          failed = true;
        }
        if (row?.id && started === generation) {
          try {
            await devices.remove(row.id, AbortSignal.timeout(5000));
            if (read()?.id === row.id) save(null);
          } catch {
            failed = true;
          }
        }
        if (started === generation)
          update({
            state: failed ? 'error' : adapter.configured ? 'idle' : 'missing-config',
            busy: false,
            message: failed
              ? 'Chưa xác nhận hủy hoàn toàn. Thử lại; nếu dùng máy chung, tắt quyền thông báo của website trong trình duyệt.'
              : 'Đã tắt đăng ký push trên trình duyệt này.',
          });
      });
    },
    suspend() {
      actor = null;
      ++generation;
      controller?.abort();
      update({ state: adapter.configured ? 'idle' : 'missing-config', busy: false, message: '' });
    },
  };
  return service;
}
