import type { GatewayHttpClient } from '../http/http-client';
import * as d from '../http/decode';
export interface DeviceRepository {
  register(token: string, signal: AbortSignal): Promise<string>;
  remove(id: string, signal: AbortSignal): Promise<void>;
}
export function createDeviceRepository(client: GatewayHttpClient): DeviceRepository {
  return {
    async register(token, signal) {
      const response = await client.write('/api/v1/me/devices', {
        method: 'POST',
        body: { platform: 'WEB', token },
        includeCredentials: true,
        signal,
      });
      if (response.status !== 200) throw Error('Invalid device response');
      const row = d.object(response.data);
      d.enumeration(row.platform, ['WEB']);
      d.instant(row.last_seen_at);
      if (!d.boolean(row.active)) throw Error('Device inactive');
      return d.uuid(row.id);
    },
    async remove(id, signal) {
      const response = await client.write('/api/v1/me/devices/' + d.uuid(id), {
        method: 'DELETE',
        includeCredentials: true,
        signal,
        responseType: 'empty',
      });
      if (response.status !== 204) throw Error('Invalid device deletion');
    },
  };
}
