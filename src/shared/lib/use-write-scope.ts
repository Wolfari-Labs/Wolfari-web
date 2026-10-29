import { useLayoutEffect, useRef } from 'react';
import { useOptionalSessionManager } from '../../app/session-context';

/** An in-flight response must never repopulate private state after logout/account change. */
export function useWriteScope(identity: string) {
  const manager = useOptionalSessionManager();
  const current = useRef(new AbortController());
  useLayoutEffect(() => {
    const controller = new AbortController();
    current.current = controller;
    const unsubscribe = manager?.subscribe(() => {
      if (manager.status() !== 'authenticated') controller.abort();
    });
    return () => {
      controller.abort();
      unsubscribe?.();
    };
  }, [identity, manager]);
  return () => current.current.signal;
}
