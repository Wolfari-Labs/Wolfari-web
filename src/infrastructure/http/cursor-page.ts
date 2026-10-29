import type { GatewayRead } from './http-client';
import * as d from './decode';
export function cursorPage<T extends { id: string }>(
  response: GatewayRead,
  decode: (value: unknown) => T,
): d.Page<T> {
  const items = d.list(response.data, decode),
    cursor = response.metadata?.nextCursor;
  if (
    cursor === undefined ||
    new Set(items.map((i) => i.id)).size !== items.length ||
    (cursor !== null && (!cursor || !items.length))
  )
    throw Error('Invalid cursor page');
  return { items, nextCursor: cursor };
}
