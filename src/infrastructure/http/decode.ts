/** Small strict wire decoders. Never coerce malformed data into empty/success/permission. */
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid object');
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== 'string') throw Error('Invalid string');
  return value;
}
export function uuid(value: unknown): string {
  const s = string(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) throw Error('Invalid UUID');
  return s;
}
export function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 2147483647) throw Error('Invalid version');
  return value;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw Error('Invalid boolean');
  return value;
}
export function enumeration<const T extends readonly string[]>(value: unknown, choices: T): T[number] {
  if (typeof value !== 'string' || !choices.includes(value)) throw Error('Invalid enum');
  return value as T[number];
}
export function nullable<T>(value: unknown, decode: (value: unknown) => T): T | null {
  return value === null ? null : decode(value);
}
export function instant(value: unknown): string {
  const s = string(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) throw Error('Invalid instant');
  return s;
}
export function money(value: unknown, positive = false): string {
  const s = string(value);
  if (!/^(0|[1-9]\d{0,18})$/.test(s) || BigInt(s) > 9223372036854775807n || (positive && s === '0')) throw Error('Invalid int64');
  return s;
}
export function list<T>(value: unknown, decode: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) throw Error('Invalid array');
  return value.map(decode);
}
export function scope(actual: string, expected: string): void {
  if (actual !== expected) throw Error('Scope mismatch');
}
export interface Page<T> { items: T[]; nextCursor: string | null }
export function page<T extends { id: string }>(value: unknown, decode: (value: unknown) => T, limit = 20): Page<T> {
  const r = object(value), items = list(r.items, decode);
  const cursor = nullable(r.next_cursor, string);
  if (items.length > limit || new Set(items.map(i => i.id)).size !== items.length || (cursor !== null && (!/^[A-Za-z0-9_-]{1,1024}$/.test(cursor) || !items.length))) throw Error('Invalid page');
  return { items, nextCursor: cursor };
}
