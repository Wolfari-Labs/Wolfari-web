import { useEffect, useRef, useState } from 'react';
import type { DomainError } from '../../../shared/types/result';
import type { PlanCommandResult } from '../model/plan';

export interface PlanCommandContext {
  readonly expectedPlanVersion: number;
  readonly idempotencyKey: string;
  readonly signal: AbortSignal;
}
export type PlanCommand = (context: PlanCommandContext) => Promise<PlanCommandResult<unknown>>;
type Status = 'idle' | 'pending' | 'success' | 'error' | 'conflict' | 'unknown';
interface Attempt {
  command: PlanCommand;
  expectedPlanVersion: number;
  idempotencyKey: string;
}
const flights = new Set<string>();
const unavailable: DomainError = {
  code: 'SERVICE_UNAVAILABLE',
  correlationId: null,
  retryable: false,
};

/** Commands must close over an immutable copy of the user's submitted fields. */
export function usePlanCommands({
  tripId,
  planVersion,
  refresh,
  recoveryScope,
  restoreCommand,
}: {
  tripId: string;
  planVersion: number;
  refresh: () => Promise<boolean>;
  recoveryScope?: string;
  restoreCommand?: (payload: unknown) => PlanCommand | null;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<DomainError | null>(null);
  const [pending, setPending] = useState(false);
  const [canRetryUnknown, setCanRetryUnknown] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(true);
  const restorer = useRef(restoreCommand);
  restorer.current = restoreCommand;
  const recoveryKey = recoveryScope ? `wolfari:plan-command:${recoveryScope}` : null;
  const invalidRecovery = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const blockedRef = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    generation.current += 1;
    blockedRef.current = false;
    busy.current = false;
    attempt.current = null;
    setStatus('idle');
    setError(null);
    setPending(false);
    setCanRetryUnknown(false);
    setBlocked(false);
    setRecoveryAvailable(true);
    invalidRecovery.current = false;
    if (recoveryKey) {
      try {
        const raw = window.sessionStorage.getItem(recoveryKey);
        if (raw) {
          const record = JSON.parse(raw) as Record<string, unknown>;
          if (record.terminal === true) {
            blockedRef.current = true;
            setBlocked(true);
            setStatus('conflict');
            return () => {
              generation.current += 1;
              controller.current?.abort();
            };
          }
          const command = restorer.current?.(record.payload);
          if (
            !command ||
            typeof record.idempotencyKey !== 'string' ||
            !record.idempotencyKey ||
            typeof record.expectedPlanVersion !== 'number' ||
            !Number.isInteger(record.expectedPlanVersion) ||
            record.expectedPlanVersion < 1
          )
            throw Error('Invalid recovery record');
          attempt.current = {
            command,
            expectedPlanVersion: record.expectedPlanVersion,
            idempotencyKey: record.idempotencyKey,
          };
          blockedRef.current = true;
          setBlocked(true);
          setStatus('unknown');
          setError(unavailable);
        }
      } catch {
        invalidRecovery.current = true;
        blockedRef.current = true;
        setBlocked(true);
        setRecoveryAvailable(false);
        setStatus('error');
        setError(unavailable);
      }
    }
    return () => {
      generation.current += 1;
      controller.current?.abort();
    };
  }, [tripId, recoveryKey]);

  function clearRecovery() {
    if (!recoveryKey) return;
    try {
      window.sessionStorage.removeItem(recoveryKey);
    } catch {
      setRecoveryAvailable(false);
      // If deletion is disallowed but overwrite works, never restore a confirmed command.
      try {
        window.sessionStorage.setItem(recoveryKey, JSON.stringify({ terminal: true }));
      } catch {
        /* Storage may be entirely inaccessible; replay still uses the original server receipt key. */
      }
    }
  }

  async function run(intent: Attempt): Promise<boolean> {
    if (busy.current || flights.has(tripId)) return false;
    const token = generation.current;
    busy.current = true;
    flights.add(tripId);
    controller.current = new AbortController();
    setPending(true);
    setStatus('pending');
    setError(null);
    setCanRetryUnknown(false);
    try {
      let result: PlanCommandResult<unknown>;
      try {
        result = await intent.command({ ...intent, signal: controller.current.signal });
      } catch {
        result = { status: 'error', error: unavailable };
      }
      if (token !== generation.current) return false;
      if (result.status === 'success') {
        attempt.current = null;
        clearRecovery();
        // The server confirmed this write; a failed read must never replay it.
        const ready = await refresh().catch(() => false);
        if (token !== generation.current) return false;
        blockedRef.current = !ready;
        setBlocked(!ready);
        setStatus(ready ? 'success' : 'conflict');
        setError(ready ? null : unavailable);
        return true;
      }
      setError(result.error);
      if (result.error.code === 'SERVICE_UNAVAILABLE') {
        blockedRef.current = true;
        setBlocked(true);
        setStatus('unknown');
      } else {
        attempt.current = null;
        clearRecovery();
        const conflict = ['VERSION_CONFLICT', 'STATE_CONFLICT', 'IDEMPOTENCY_CONFLICT'].includes(
          result.error.code,
        );
        const needsRefresh =
          conflict ||
          ['PERMISSION_DENIED', 'RESOURCE_NOT_FOUND', 'UNAUTHENTICATED'].includes(
            result.error.code,
          );
        blockedRef.current = needsRefresh;
        setBlocked(needsRefresh);
        setStatus(conflict ? 'conflict' : 'error');
      }
      return false;
    } finally {
      flights.delete(tripId);
      if (token === generation.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }

  async function execute(command: PlanCommand, recovery?: Record<string, unknown>) {
    if (blockedRef.current || busy.current || flights.has(tripId)) return false;
    const intent = {
      command,
      expectedPlanVersion: planVersion,
      idempotencyKey: crypto.randomUUID(),
    };
    if (recoveryKey && recovery) {
      try {
        window.sessionStorage.setItem(
          recoveryKey,
          JSON.stringify({
            expectedPlanVersion: intent.expectedPlanVersion,
            idempotencyKey: intent.idempotencyKey,
            payload: recovery,
          }),
        );
        setRecoveryAvailable(true);
      } catch {
        setRecoveryAvailable(false);
        setStatus('error');
        setError(unavailable);
        return false;
      }
    }
    attempt.current = intent;
    return run(intent);
  }
  async function reconcile() {
    if (busy.current || flights.has(tripId) || invalidRecovery.current) return false;
    const token = generation.current;
    busy.current = true;
    setPending(true);
    try {
      const ready = await refresh().catch(() => false);
      if (token !== generation.current) return false;
      if (ready && attempt.current) setCanRetryUnknown(true);
      else if (ready) {
        blockedRef.current = false;
        setBlocked(false);
        setStatus('idle');
        setError(null);
      }
      return ready;
    } finally {
      if (token === generation.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  async function retryUnknown() {
    if (!canRetryUnknown || !attempt.current) return false;
    return run(attempt.current);
  }
  return {
    execute,
    reconcile,
    retryUnknown,
    pending,
    blocked,
    error,
    status,
    canRetryUnknown,
    recoveryAvailable,
  };
}
