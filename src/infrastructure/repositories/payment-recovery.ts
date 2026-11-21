import { uuid } from '../http/decode';
export function createPaymentRecovery(storage: Storage) {
  const key = (actor: string, trip: string) => `wolfari:payment:${uuid(actor)}:${uuid(trip)}`;
  return {
    list(actor: string, trip: string): Record<string, string> {
      const rows = JSON.parse(
        storage.getItem(key(actor, trip) + ':contributions') ?? '{}',
      ) as Record<string, string>;
      if (!rows || Array.isArray(rows) || typeof rows !== 'object')
        throw Error('Invalid recovery map');
      for (const [contribution, attempt] of Object.entries(rows)) {
        uuid(contribution);
        uuid(attempt);
      }
      return rows;
    },
    load(actor: string, trip: string) {
      const id = storage.getItem(key(actor, trip)) ?? '';
      if (id) uuid(id);
      storage.setItem(key(actor, trip), id);
      return id;
    },
    save(actor: string, trip: string, id: string, contribution?: string) {
      if (contribution) {
        const rows = this.list(actor, trip);
        rows[uuid(contribution)] = uuid(id);
        storage.setItem(key(actor, trip) + ':contributions', JSON.stringify(rows));
      }
      storage.setItem(key(actor, trip), uuid(id));
    },
  };
}
