import type { FundRepository } from '../../features/fund/model/fund';
import type { GatewayHttpClient } from '../http/http-client';
import type { CommandCoordinator } from '../operations/command-coordinator';
import { ApiError } from '../http/api-error';
import * as d from '../http/decode';
import { decodeContribution, decodeDestination, decodeFund, decodeInstruction, decodeLedger, decodeRequest } from './finance-decoders';

export function createGatewayFundRepository(reader?: FundRepository['getFund'], client?: GatewayHttpClient, commands?: CommandCoordinator): FundRepository {
  async function read<T>(path: string, decode: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
    if (!client) throw Error('No Gateway');
    const r = await client.read(path, { ...(signal ? { signal } : {}), includeCredentials: true });
    try { if (r.status !== 200) throw Error('Invalid read status'); return decode(r.data); }
    catch { throw new ApiError('Invalid Finance contract', 'invalid-response', r.status ?? 200, null, r.correlationId, false); }
  }
  const root = (id: string) => '/api/v1/funds/' + d.uuid(id);
  const query = (cursor: string | undefined, limit: number) => '?' + new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) }).toString();
  return {
    ...(client && commands ? { runtime: {
      commands,
      async fund(tripId: string, signal?: AbortSignal) {
        try { return await read('/api/v1/trips/' + d.uuid(tripId) + '/fund', v => decodeFund(v, tripId), signal); }
        catch (error) { if (error instanceof ApiError && error.status === 404 && error.code === 'RESOURCE_NOT_FOUND') return null; throw error; }
      },
      destinations: (id: string, signal?: AbortSignal) => read(root(id) + '/destinations', v => {
        const result = d.list(v, item => decodeDestination(item, id));
        if (new Set(result.map(i => i.id)).size !== result.length) throw Error('Duplicate destination'); return result;
      }, signal),
      requests: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) => read(root(id) + '/contribution-requests' + query(cursor, limit), v => d.page(v, item => decodeRequest(item, id), limit), signal),
      contributions: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) => read(root(id) + '/contributions' + query(cursor, limit), v => d.page(v, item => decodeContribution(item, id), limit), signal),
      ledger: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) => read(root(id) + '/transactions' + query(cursor, limit), v => d.page(v, item => decodeLedger(item, id), limit), signal),
      instruction: (id: string, signal?: AbortSignal) => read('/api/v1/contributions/' + d.uuid(id) + '/vietqr', v => decodeInstruction(v, id), signal),
    } } : {}),
    getFund:
      reader ??
      (async ({ signal }) => {
        signal.throwIfAborted();
        return {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: false },
        };
      }),
  };
}
