import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SessionManagerLike {
  status(): string;
  subscribe(listener: () => void): () => void;
  clear?(): void;
}

const Context = createContext<SessionManagerLike | null>(null);

export function SessionManagerProvider({
  manager,
  children,
}: {
  manager: SessionManagerLike;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  useLayoutEffect(() => {
    const sync = () => {
      if (manager.status() !== 'authenticated') {
        void queryClient.cancelQueries();
        queryClient.removeQueries();
      }
    };
    sync();
    return manager.subscribe(sync);
  }, [manager, queryClient]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}

export function useOptionalSessionManager() {
  return useContext(Context);
}
