import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
import { cursorPage } from '../http/cursor-page';
import {
  notificationGroups,
  type Preferences,
  type NotificationItem,
} from '../../features/notifications/notification.repository';
export function decodeNotification(value: unknown): NotificationItem {
  const r = d.object(value);
  d.enumeration(r.status, ['AVAILABLE']);
  return {
    id: d.uuid(r.id),
    type: d.string(r.type),
    title: d.string(r.title),
    body: d.string(r.body),
    tripId: d.nullable(r.trip_id, d.uuid),
    sourceId: d.nullable(r.source_id, d.string),
    createdAt: d.instant(r.created_at),
    readAt: d.nullable(r.read_at, d.instant),
  };
}
export function decodePreferences(value: unknown): Preferences {
  const r = d.object(value),
    raw = d.object(r.group_overrides);
  const group_overrides: Preferences['group_overrides'] = {};
  for (const key of notificationGroups)
    if (raw[key] !== undefined) {
      const item = d.object(raw[key]);
      group_overrides[key] = {
        ...(item.push === undefined ? {} : { push: d.boolean(item.push) }),
        ...(item.email === undefined ? {} : { email: d.boolean(item.email) }),
      };
    }
  return {
    push_enabled: d.boolean(r.push_enabled),
    email_enabled: d.boolean(r.email_enabled),
    group_overrides,
    version: d.version(r.version),
  };
}
export function createNotificationRepository(client: GatewayHttpClient) {
  return {
    async list(unread: boolean | undefined, cursor: string | null, signal?: AbortSignal) {
      const query = new URLSearchParams({ limit: '20' });
      if (unread !== undefined) query.set('unread', String(unread));
      if (cursor) query.set('cursor', cursor);
      return cursorPage(
        await client.read('/api/v1/me/notifications?' + query, signal ? { signal } : {}),
        decodeNotification,
      );
    },
    async read(id: string, signal?: AbortSignal) {
      return decodeNotification(
        (
          await client.write(`/api/v1/me/notifications/${encodeURIComponent(id)}/read`, {
            method: 'PATCH',
            ...(signal ? { signal } : {}),
          })
        ).data,
      );
    },
    async preferences(signal?: AbortSignal) {
      return decodePreferences(
        (await client.read('/api/v1/me/notification-preferences', signal ? { signal } : {})).data,
      );
    },
    async save(value: Preferences, signal?: AbortSignal) {
      const { version, ...fields } = value;
      return decodePreferences(
        (
          await client.write('/api/v1/me/notification-preferences', {
            method: 'PUT',
            ...(signal ? { signal } : {}),
            body: { ...fields, expected_version: version },
          })
        ).data,
      );
    },
  };
}
