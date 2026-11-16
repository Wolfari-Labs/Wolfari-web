import type { FundRepository } from '../../features/fund/model/fund';
import type { GatewayHttpClient } from '../http/http-client';
import type { CommandCoordinator } from '../operations/command-coordinator';
import { ApiError } from '../http/api-error';
import * as d from '../http/decode';
import { decodeClosure } from './finance-closure-decoder';
import {
  decodeExpense,
  decodeFinancialNote,
  decodeHandover,
  decodeRefund,
  decodeHistory,
} from './finance-extended-decoders';
import {
  decodeBank,
  decodeContribution,
  decodeDestination,
  decodeFund,
  decodeInstruction,
  decodeLedger,
  decodeRequest,
} from './finance-decoders';

export function createGatewayFundRepository(
  reader?: FundRepository['getFund'],
  client?: GatewayHttpClient,
  commands?: CommandCoordinator,
): FundRepository {
  async function read<T>(
    path: string,
    decode: (value: unknown) => T,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!client) throw Error('No Gateway');
    const r = await client.read(path, { ...(signal ? { signal } : {}), includeCredentials: true });
    try {
      if (r.status !== 200) throw Error('Invalid read status');
      return decode(r.data);
    } catch {
      throw new ApiError(
        'Invalid Finance contract',
        'invalid-response',
        r.status ?? 200,
        null,
        r.correlationId,
        false,
      );
    }
  }
  const root = (id: string) => '/api/v1/funds/' + d.uuid(id);
  const query = (cursor: string | undefined, limit: number) =>
    '?' + new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) }).toString();
  return {
    ...(client && commands
      ? {
          runtime: {
            commands,
            history: (id, cursor, signal) =>
              read(
                root(id) + '/history' + query(cursor, 20),
                (v) => d.page(v, (item) => decodeHistory(item, id), 20),
                signal,
              ),
            closures: (id, tripId, cursor, signal) =>
              read(
                root(id) + '/closures' + query(cursor, 20),
                (v) => d.page(v, (item) => decodeClosure(item, id, tripId), 20),
                signal,
              ),
            closure: (id, fundId, tripId, signal) =>
              read(
                '/api/v1/closures/' + d.uuid(id),
                (v) => {
                  const row = decodeClosure(v, fundId, tripId);
                  d.scope(row.id, id);
                  return row;
                },
                signal,
              ),
            refunds: (id, cursor, signal, status) =>
              read(
                root(id) +
                  '/refunds' +
                  query(cursor, 20) +
                  (status ? '&status=' + encodeURIComponent(status) : ''),
                (v) => d.page(v, (item) => decodeRefund(item, id), 20),
                signal,
              ),
            notes: (id, cursor, signal) =>
              read(
                root(id) + '/notes' + query(cursor, 20),
                (v) => d.page(v, (item) => decodeFinancialNote(item, id), 20),
                signal,
              ),
            expenses: (id, cursor, signal, status) =>
              read(
                root(id) +
                  '/expenses' +
                  query(cursor, 20) +
                  (status ? '&status=' + encodeURIComponent(status) : ''),
                (v) => d.page(v, (item) => decodeExpense(item, id), 20),
                signal,
              ),
            async fund(tripId: string, signal?: AbortSignal) {
              try {
                return await read(
                  '/api/v1/trips/' + d.uuid(tripId) + '/fund',
                  (v) => decodeFund(v, tripId),
                  signal,
                );
              } catch (error) {
                if (
                  error instanceof ApiError &&
                  error.status === 404 &&
                  error.code === 'RESOURCE_NOT_FOUND'
                )
                  return null;
                throw error;
              }
            },
            destinations: (id: string, signal?: AbortSignal) =>
              read(
                root(id) + '/destinations',
                (v) => {
                  const result = d.list(v, (item) => decodeDestination(item, id));
                  if (new Set(result.map((i) => i.id)).size !== result.length)
                    throw Error('Duplicate destination');
                  return result;
                },
                signal,
              ),
            requests: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) =>
              read(
                root(id) + '/contribution-requests' + query(cursor, limit),
                (v) => d.page(v, (item) => decodeRequest(item, id), limit),
                signal,
              ),
            contributions: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) =>
              read(
                root(id) + '/contributions' + query(cursor, limit),
                (v) => d.page(v, (item) => decodeContribution(item, id), limit),
                signal,
              ),
            ledger: (id: string, cursor?: string, signal?: AbortSignal, limit = 20) =>
              read(
                root(id) + '/transactions' + query(cursor, limit),
                (v) => d.page(v, (item) => decodeLedger(item, id), limit),
                signal,
              ),
            instruction: (id: string, signal?: AbortSignal) =>
              read(
                '/api/v1/contributions/' + d.uuid(id) + '/vietqr',
                (v) => decodeInstruction(v, id),
                signal,
              ),
            handovers: (fundId: string, signal?: AbortSignal) =>
              read(
                root(fundId) + '/holder-handovers',
                (v) => d.list(d.object(v).items, (item) => decodeHandover(item, fundId)),
                signal,
              ),
            banks: (signal?: AbortSignal) =>
              read('/api/v1/finance/banks', (v) => d.list(d.object(v).items, decodeBank), signal),
            // Upload has no idempotency contract: a retry may stage another temporary file, which
            // expires unbound after 24 hours. The key is only usable once an expense binds it.
            async uploadReceipt(fundId: string, file: File, signal?: AbortSignal) {
              if (!client) throw Error('No Gateway');
              const form = new FormData();
              form.append('file', file, file.name);
              const r = await client.write(root(fundId) + '/receipts', {
                method: 'POST',
                body: form,
                includeCredentials: true,
                ...(signal ? { signal } : {}),
              });
              const data = d.object(r.data);
              const key = d.string(data.object_key);
              if (!key.startsWith('funds/' + fundId + '/receipts/'))
                throw new ApiError(
                  'Invalid receipt reference',
                  'invalid-response',
                  r.status ?? 201,
                  null,
                  r.correlationId,
                  false,
                );
              return { object_key: key, mime_type: d.string(data.mime_type) };
            },
            async expenseReceipt(expenseId: string, signal?: AbortSignal) {
              if (!client) throw Error('No Gateway');
              const r = await client.read('/api/v1/expenses/' + d.uuid(expenseId) + '/receipt', {
                responseType: 'bytes',
                includeCredentials: true,
                ...(signal ? { signal } : {}),
              });
              const type = r.contentType?.split(';')[0]?.trim() ?? '';
              if (
                !(r.data instanceof ArrayBuffer) ||
                !r.data.byteLength ||
                !['image/jpeg', 'image/png', 'application/pdf'].includes(type)
              )
                throw new ApiError(
                  'Invalid receipt file',
                  'invalid-response',
                  r.status ?? 200,
                  null,
                  r.correlationId,
                  false,
                );
              return new Blob([r.data], { type });
            },
          },
        }
      : {}),
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
