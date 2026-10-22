import { useEffect, useRef, useState } from 'react';

// One write at a time per form/page; cancel work when its owner unmounts.
export function useIdentityTask() {
  const active = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  const run = async (
    name: string,
    task: (signal: AbortSignal) => Promise<void>,
    onError: () => void,
  ) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(name);
    try {
      await task(controller.signal);
    } catch {
      if (!controller.signal.aborted) onError();
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (!controller.signal.aborted) setPending(null);
      }
    }
  };
  return { pending, run };
}
