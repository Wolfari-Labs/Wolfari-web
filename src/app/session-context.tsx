import { createContext, useContext, type ReactNode } from 'react';

export interface SessionManagerLike {
  status(): string;
  subscribe(listener: () => void): () => void;
  clear?(): void;
}

const Context = createContext<SessionManagerLike | null>(null);

export function SessionManagerProvider({ manager, children }: { manager: SessionManagerLike; children: ReactNode }) {
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}

export function useOptionalSessionManager() {
  return useContext(Context);
}
