export type PushState =
  'missing-config' | 'unsupported' | 'idle' | 'denied' | 'registered' | 'error';
export interface PushSnapshot {
  state: PushState;
  busy: boolean;
  message: string;
}
export interface BrowserPush {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PushSnapshot;
  activate(actor: string): void;
  enable(actor: string): Promise<void>;
  disconnect(): Promise<void>;
  suspend(): void;
}
