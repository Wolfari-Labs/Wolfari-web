export type StorageStatus = 'saved' | 'memory';

/** Accessing the storage property itself can throw a SecurityError. */
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}

/** Raw values plus a tombstone retain writes/removals when storage is unavailable. */
export function createStorageFallback() {
  const entries = new Map<
    string,
    { raw: string | null; baseline: string | null; status: StorageStatus }
  >();
  return {
    read(storage: Storage | null, key: string) {
      const cached = entries.get(key);
      try {
        if (!storage) throw new Error('Storage unavailable');
        const raw = storage.getItem(key);
        if (cached?.status === 'memory' && raw === cached.baseline) return cached;
        const entry = { raw, baseline: raw, status: 'saved' as const };
        entries.set(key, entry);
        return entry;
      } catch {
        const entry = {
          raw: cached?.raw ?? null,
          baseline: cached?.baseline ?? null,
          status: 'memory' as const,
        };
        entries.set(key, entry);
        return entry;
      }
    },
    write(storage: Storage | null, key: string, raw: string | null): StorageStatus {
      const baseline = this.read(storage, key).baseline;
      let status: StorageStatus = 'memory';
      try {
        if (!storage) throw new Error('Storage unavailable');
        if (raw === null) storage.removeItem(key);
        else storage.setItem(key, raw);
        status = 'saved';
      } catch {
        // Keep the current value (including deletions) for this page session.
      }
      entries.set(key, { raw, baseline: status === 'saved' ? raw : baseline, status });
      return status;
    },
    accept(key: string, raw: string | null) {
      entries.set(key, { raw, baseline: raw, status: 'saved' });
    },
    clear() {
      entries.clear();
    },
  };
}
