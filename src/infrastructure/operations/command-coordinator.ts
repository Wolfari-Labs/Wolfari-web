import type { GatewayHttpClient } from '../http/http-client';
import { ApiError } from '../http/api-error';
import { toDomainError } from '../http/domain-error';
import type { DomainError } from '../../shared/types/result';
import * as d from '../http/decode';

export const commandKinds = [
  'enable',
  'budget',
  'destination-create',
  'destination-edit',
  'destination-confirm',
  'request-create',
  'request-edit',
  'amount',
  'waive',
  'cancel',
  'report',
  'reject',
  'confirm',
  'leave',
  'remove',
] as const;
export type CommandKind = (typeof commandKinds)[number];
export type OperationState =
  'PROCESSING' | 'PENDING_RECOVERY' | 'SUCCEEDED' | 'FAILED' | 'NEEDS_REVIEW';
export interface Operation {
  operationId: string;
  tripId: string;
  state: OperationState;
  errorCode?: string;
}
export interface CommandDefinition {
  kind: CommandKind;
  actorId: string;
  tripId: string;
  fundId?: string;
  resourceId?: string;
  body: Record<string, unknown>;
}
export interface Intent extends Omit<CommandDefinition, 'body'> {
  key: string;
  fingerprint: string;
  body?: Record<string, unknown>;
  sensitive: boolean;
  versions: Record<string, number>;
}
export interface CommandSnapshot {
  intent: Intent | null;
  state: OperationState | 'IDLE' | 'UNKNOWN';
  busy: boolean;
  error: DomainError | null;
  receipt: unknown;
  recoveryBlocked?: boolean;
}
export const unresolved = (s: CommandSnapshot) =>
  !!s.recoveryBlocked || (!!s.intent && !['SUCCEEDED', 'FAILED'].includes(s.state));
const sensitiveKinds = new Set<CommandKind>(['enable', 'destination-create', 'destination-edit']);
export function validateCommandBody(kind: CommandKind, body: Record<string, unknown>) {
  const fields: Record<CommandKind, string[]> = {
    enable: ['holder_user_id', 'currency', 'destination', 'budget_amount'],
    budget: ['budget_amount', 'expected_finance_version'],
    'destination-create': [
      'destination_type',
      'bank_code',
      'account_number',
      'account_name',
      'momo_phone',
      'active',
      'is_default',
      'expected_finance_version',
    ],
    'destination-edit': [
      'destination_type',
      'bank_code',
      'account_number',
      'account_name',
      'momo_phone',
      'active',
      'is_default',
      'expected_finance_version',
      'expected_version',
    ],
    'destination-confirm': ['expected_finance_version', 'expected_version'],
    'request-create': ['title', 'note', 'due_at', 'contributions', 'expected_finance_version'],
    'request-edit': ['title', 'note', 'due_at', 'expected_finance_version', 'expected_version'],
    amount: ['amount', 'expected_finance_version', 'expected_version'],
    waive: ['reason', 'expected_finance_version', 'expected_version'],
    cancel: ['reason', 'expected_finance_version', 'expected_version'],
    report: ['expected_finance_version', 'expected_version'],
    reject: ['reason', 'expected_finance_version', 'expected_version'],
    confirm: ['expected_finance_version', 'expected_version'],
    leave: ['reason', 'expected_membership_revision'],
    remove: ['reason', 'expected_membership_revision'],
  };
  if (Object.keys(body).some((k) => !fields[kind].includes(k)))
    throw Error('Invalid command field');
  for (const k of fields[kind].filter((k) => k.startsWith('expected_'))) d.version(body[k]);
  for (const k of ['title', 'note', 'reason'])
    if (body[k] !== undefined) {
      const value = d.string(body[k]);
      if (
        value.includes('\u0000') ||
        value.length > (k === 'title' ? 200 : k === 'reason' ? 1000 : 2000) ||
        (k !== 'note' && !value.trim())
      )
        throw Error('Invalid text');
    }
  if (
    ['waive', 'cancel', 'reject', 'leave', 'remove'].includes(kind) &&
    typeof body.reason !== 'string'
  )
    throw Error('Missing reason');
  if (kind.startsWith('request-') && body.title === undefined) throw Error('Missing title');
  if (body.due_at !== undefined) d.instant(body.due_at);
  if (body.amount !== undefined) d.money(body.amount, true);
  if (body.budget_amount !== undefined && body.budget_amount !== null) d.money(body.budget_amount);
  if (kind === 'amount' && body.amount === undefined) throw Error('Missing amount');
  if (kind === 'budget' && body.budget_amount === undefined) throw Error('Missing budget');
  if (kind === 'request-create') {
    const rows = d.list(body.contributions, (value) => {
      const row = d.object(value);
      if (Object.keys(row).some((k) => !['member_user_id', 'amount', 'destination_id'].includes(k)))
        throw Error('Invalid allocation');
      d.uuid(row.member_user_id);
      d.uuid(row.destination_id);
      d.money(row.amount, true);
      return row;
    });
    if (!rows.length || new Set(rows.map((r) => r.member_user_id)).size !== rows.length)
      throw Error('Invalid allocations');
  }
  if (sensitiveKinds.has(kind)) {
    const config = kind === 'enable' ? d.object(body.destination) : body;
    if (kind === 'enable') {
      d.uuid(body.holder_user_id);
      d.enumeration(body.currency, ['VND']);
    }
    const type = d.enumeration(config.destination_type, ['VIETQR', 'MOMO_SANDBOX']);
    const keys =
      type === 'VIETQR' ? ['bank_code', 'account_number', 'account_name'] : ['momo_phone'];
    if (
      kind === 'enable' &&
      Object.keys(config).some(
        (k) => !['destination_type', 'active', 'is_default', ...keys].includes(k),
      )
    )
      throw Error('Invalid destination');
    d.boolean(config.active);
    d.boolean(config.is_default);
    for (const k of keys) {
      const v = d.string(config[k]);
      if (!v.trim() || v.includes('\u0000') || v.length > 150) throw Error('Invalid recipient');
    }
  }
}
export function commandRoute(i: Pick<Intent, 'kind' | 'tripId' | 'fundId' | 'resourceId'>): {
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
} {
  d.uuid(i.tripId);
  const fund = () => '/api/v1/funds/' + d.uuid(i.fundId);
  const resource = () => d.uuid(i.resourceId);
  switch (i.kind) {
    case 'enable':
      return { path: `/api/v1/trips/${i.tripId}/fund`, method: 'POST' };
    case 'budget':
      return { path: fund() + '/budget', method: 'PATCH' };
    case 'destination-create':
      return { path: fund() + '/destinations', method: 'POST' };
    case 'destination-edit':
      return { path: fund() + '/destinations/' + resource(), method: 'PATCH' };
    case 'destination-confirm':
      return { path: fund() + '/destinations/' + resource() + '/confirm', method: 'POST' };
    case 'request-create':
      return { path: fund() + '/contribution-requests', method: 'POST' };
    case 'request-edit':
      return { path: fund() + '/contribution-requests/' + resource(), method: 'PATCH' };
    case 'leave':
      return { path: `/api/v1/trips/${i.tripId}/leave`, method: 'POST' };
    case 'remove':
      return { path: `/api/v1/trips/${i.tripId}/members/${resource()}`, method: 'DELETE' };
    default: {
      d.uuid(i.fundId);
      const action = {
        amount: '',
        waive: '/waive',
        cancel: '/cancel',
        report: '/report-transfer',
        reject: '/reject-transfer',
        confirm: '/confirm-received',
      }[i.kind];
      return {
        path: '/api/v1/contributions/' + resource() + action,
        method: i.kind === 'amount' ? 'PATCH' : 'POST',
      };
    }
  }
}
export function decodeOperation(value: unknown, intent: Pick<Intent, 'key' | 'tripId'>): Operation {
  const r = d.object(value);
  d.scope(d.uuid(r.operation_id), intent.key);
  d.scope(d.uuid(r.trip_id), intent.tripId);
  const state = d.enumeration(r.state, [
    'PROCESSING',
    'PENDING_RECOVERY',
    'SUCCEEDED',
    'FAILED',
    'NEEDS_REVIEW',
  ]);
  if (r.next_retry_at !== undefined) d.instant(r.next_retry_at);
  let errorCode =
    r.error_code === undefined
      ? undefined
      : d.enumeration(r.error_code, [
          'FINANCE_OBLIGATION_BLOCKED',
          'STATE_CONFLICT',
          'VERSION_CONFLICT',
        ]);
  if (r.outcome !== undefined) {
    const outcome = d.object(r.outcome),
      status = d.enumeration(outcome.status, ['COMMITTED', 'REJECTED', 'CANCELLED']);
    if (
      (state === 'SUCCEEDED' && status !== 'COMMITTED') ||
      (state === 'FAILED' && status === 'COMMITTED')
    )
      throw Error('Invalid outcome');
    if (outcome.error_code !== undefined)
      errorCode = d.enumeration(outcome.error_code, [
        'FINANCE_OBLIGATION_BLOCKED',
        'STATE_CONFLICT',
        'VERSION_CONFLICT',
      ]);
  }
  return {
    operationId: intent.key,
    tripId: intent.tripId,
    state,
    ...(errorCode ? { errorCode } : {}),
  };
}
/** Stable canonical snapshot, never linked to a form's mutable draft. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(d.object(value))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  )
    return JSON.stringify(value);
  throw Error('Invalid command JSON');
}
async function fingerprint(body: Record<string, unknown>): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(body)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export type ReceiptDecoder = (value: unknown, intent: Intent) => unknown;
export function createCommandCoordinator(
  client: GatewayHttpClient,
  decodeReceipt: ReceiptDecoder,
  storage?: Storage,
) {
  const sessions = new Map<string, ReturnType<typeof session>>();
  function session(actorId: string, tripId: string) {
    d.uuid(actorId);
    d.uuid(tripId);
    const storageKey = `wolfari.demo1.operation.v1:${actorId}:${tripId}`;
    let current: CommandSnapshot = {
      intent: null,
      state: 'IDLE',
      busy: false,
      error: null,
      receipt: null,
    };
    const listeners = new Set<() => void>();
    const lifetime = new AbortController();
    let journalAvailable = storage !== undefined;
    if (!journalAvailable) current = { ...current, recoveryBlocked: true };
    const persist = () => {
      if (!journalAvailable) return;
      try {
        if (!current.intent) storage?.removeItem(storageKey);
        else {
          // Bank/recipient input remains in memory. No response, token or credential is stored.
          const { body, ...safe } = current.intent;
          storage?.setItem(
            storageKey,
            JSON.stringify({
              intent: { ...safe, ...(!safe.sensitive ? { body } : {}) },
              state: current.state,
            }),
          );
        }
      } catch {
        journalAvailable = false;
        current = { ...current, recoveryBlocked: true };
      }
    };
    const update = (patch: Partial<CommandSnapshot>) => {
      if (lifetime.signal.aborted) return;
      current = { ...current, ...patch };
      persist();
      for (const f of listeners) f();
    };
    try {
      const raw = storage?.getItem(storageKey);
      if (raw !== undefined && raw !== null) {
        if (!raw || raw.length > 150000) throw Error('Invalid journal');
        const r = d.object(JSON.parse(raw)),
          i = d.object(r.intent);
        if (
          Object.keys(r).some((k) => !['intent', 'state'].includes(k)) ||
          Object.keys(i).some(
            (k) =>
              ![
                'actorId',
                'tripId',
                'kind',
                'key',
                'fingerprint',
                'sensitive',
                'versions',
                'fundId',
                'resourceId',
                'body',
              ].includes(k),
          )
        )
          throw Error('Invalid journal field');
        d.scope(d.uuid(i.actorId), actorId);
        d.scope(d.uuid(i.tripId), tripId);
        const kind = d.enumeration(i.kind, commandKinds),
          key = d.uuid(i.key);
        const hash = d.string(i.fingerprint);
        if (!/^[a-f0-9]{64}$/.test(hash) || i.sensitive !== sensitiveKinds.has(kind))
          throw Error('Invalid journal');
        const versions = Object.fromEntries(
          Object.entries(d.object(i.versions)).map(([k, v]) => {
            if (
              ![
                'expected_version',
                'expected_finance_version',
                'expected_membership_revision',
              ].includes(k)
            )
              throw Error('Invalid version key');
            return [k, d.version(v)];
          }),
        );
        const intent: Intent = {
          actorId,
          tripId,
          kind,
          key,
          fingerprint: hash,
          sensitive: sensitiveKinds.has(kind),
          versions,
          ...(i.fundId === undefined ? {} : { fundId: d.uuid(i.fundId) }),
          ...(i.resourceId === undefined ? {} : { resourceId: d.uuid(i.resourceId) }),
          ...(!sensitiveKinds.has(kind) && i.body !== undefined ? { body: d.object(i.body) } : {}),
        };
        commandRoute(intent);
        if (intent.body) validateCommandBody(kind, intent.body);
        current = {
          ...current,
          intent,
          state: d.enumeration(r.state, [
            'UNKNOWN',
            'PROCESSING',
            'PENDING_RECOVERY',
            'SUCCEEDED',
            'FAILED',
            'NEEDS_REVIEW',
          ]),
        };
      }
    } catch {
      // Corruption is not evidence that the previous command failed. Keep the
      // journal for investigation and never mint a replacement key automatically.
      journalAvailable = false;
      current = { ...current, recoveryBlocked: true };
    }
    const failure = (error: unknown) => {
      const api = error instanceof ApiError ? error : null;
      const known =
        api?.kind === 'http' && api.status !== null && api.status >= 400 && api.status < 500;
      update({
        busy: false,
        state: api?.code === 'IDEMPOTENCY_CONFLICT' ? 'NEEDS_REVIEW' : known ? 'FAILED' : 'UNKNOWN',
        error: toDomainError(error),
      });
    };
    async function execute(committed = false) {
      const i = current.intent;
      if (!i || !i.body) {
        update({ busy: false });
        return;
      }
      try {
        lifetime.signal.throwIfAborted();
        validateCommandBody(i.kind, i.body);
        if ((await fingerprint(i.body)) !== i.fingerprint)
          throw new ApiError('Intent mismatch', 'http', 409, 'IDEMPOTENCY_CONFLICT', null, false);
        lifetime.signal.throwIfAborted();
        if (!journalAvailable)
          throw new ApiError('Cannot persist recovery journal', 'network', null, null, null, false);
        const r = await client.write(commandRoute(i).path, {
          ...commandRoute(i),
          body: i.body,
          idempotencyKey: i.key,
          includeCredentials: true,
          signal: lifetime.signal,
        });
        if (r.status === 202 || i.kind === 'leave' || i.kind === 'remove') {
          const op = decodeOperation(r.data, i);
          if (r.status === 202 && ['SUCCEEDED', 'FAILED'].includes(op.state))
            throw Error('Invalid 202');
          update({
            state: op.state,
            busy: false,
            error: op.errorCode
              ? {
                  code: op.errorCode as DomainError['code'],
                  correlationId: r.correlationId,
                  retryable: false,
                }
              : null,
          });
        } else {
          if (r.status !== 200 && r.status !== 201) throw Error('Invalid command status');
          const receipt = decodeReceipt(r.data, i);
          update({ state: 'SUCCEEDED', busy: false, error: null, receipt });
        }
      } catch (error) {
        if (committed) update({ state: 'SUCCEEDED', busy: false, error: toDomainError(error) });
        else failure(error);
      }
    }
    return {
      getSnapshot: () => current,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      async submit(definition: CommandDefinition) {
        if (lifetime.signal.aborted || current.busy || unresolved(current)) return;
        validateCommandBody(definition.kind, definition.body);
        d.scope(definition.actorId, actorId);
        d.scope(definition.tripId, tripId);
        commandRoute(definition);
        update({ busy: true, state: 'PROCESSING', error: null, receipt: null });
        try {
          const body = JSON.parse(canonical(definition.body)) as Record<string, unknown>;
          const versions = Object.fromEntries(
            Object.entries(body)
              .filter(([k]) =>
                [
                  'expected_version',
                  'expected_finance_version',
                  'expected_membership_revision',
                ].includes(k),
              )
              .map(([k, v]) => [k, d.version(v)]),
          );
          const intent: Intent = {
            ...definition,
            body,
            versions,
            key: crypto.randomUUID(),
            fingerprint: await fingerprint(body),
            sensitive: sensitiveKinds.has(definition.kind),
          };
          update({ intent });
          await execute();
        } catch (error) {
          failure(error);
        }
      },
      async retry(body?: Record<string, unknown>) {
        if (
          lifetime.signal.aborted ||
          !current.intent ||
          current.busy ||
          current.state === 'NEEDS_REVIEW' ||
          current.state === 'FAILED'
        )
          return;
        update({ busy: true, error: null });
        if (body && !current.intent.body) {
          if ((await fingerprint(body)) !== current.intent.fingerprint) {
            update({
              busy: false,
              error: { code: 'IDEMPOTENCY_CONFLICT', correlationId: null, retryable: false },
            });
            return;
          }
          update({
            intent: {
              ...current.intent,
              body: JSON.parse(canonical(body)) as Record<string, unknown>,
            },
          });
        }
        await execute();
      },
      async check() {
        const i = current.intent;
        if (lifetime.signal.aborted || !i || current.busy) return;
        update({ busy: true });
        try {
          const r = await client.read('/api/v1/operations/' + i.key, {
            includeCredentials: true,
            signal: lifetime.signal,
          });
          const op = decodeOperation(r.data, i);
          update({
            state: op.state,
            busy: false,
            error: op.errorCode
              ? {
                  code: op.errorCode as DomainError['code'],
                  correlationId: r.correlationId,
                  retryable: false,
                }
              : null,
          });
          // Finance operations do not expose resource IDs. Retrieve the immutable receipt if possible.
          if (op.state === 'SUCCEEDED' && i.body && i.kind !== 'leave' && i.kind !== 'remove') {
            update({ busy: true });
            await execute(true);
          }
        } catch (error) {
          // A poll failure/404 proves nothing about the original write. Retain intent/key.
          update({ busy: false, error: toDomainError(error) });
        }
      },
      dismiss() {
        if (!current.busy && !unresolved(current))
          update({ intent: null, state: 'IDLE', receipt: null, error: null });
      },
      dispose() {
        if (current.busy && current.intent) update({ state: 'UNKNOWN', busy: false });
        lifetime.abort();
        listeners.clear();
      },
    };
  }
  return {
    invalidate() {
      for (const s of sessions.values()) s.dispose();
      sessions.clear();
    },
    forScope(actorId: string, tripId: string) {
      const key = actorId + ':' + tripId;
      let s = sessions.get(key);
      if (!s) {
        s = session(actorId, tripId);
        sessions.set(key, s);
      }
      return s;
    },
  };
}
export type CommandCoordinator = ReturnType<typeof createCommandCoordinator>;
export type CommandSession = ReturnType<CommandCoordinator['forScope']>;
