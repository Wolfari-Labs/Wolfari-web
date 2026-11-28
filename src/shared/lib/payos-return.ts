/**
 * payOS sends the payer's browser to the Gateway page `PAYOS_RETURN_PATH/<token>`, where the token
 * is the unpadded base64url (UTF-8) of a Wolfari web page. The Gateway accepts only a page on its
 * own WEB_ORIGIN, then redirects there with `?provider=PAYOS&status=…&orderCode=…`. That query is
 * never proof of payment: the Web re-reads the attempt and the Fund. Mirrors
 * `packages/common/src/payos-return.ts` in the Backend.
 */
export const PAYOS_RETURN_PATH = '/api/v1/payments/payos/return/';
const MAX_CLIENT_LINK = 300;
const MAX_RETURN_URL = 1000;

const parse = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/** A same-origin web page (http/https, exact href, no query, fragment or credentials). */
export function isPayosWebLink(value: unknown, origin: string): value is string {
  if (typeof value !== 'string' || !value || value.length > MAX_CLIENT_LINK) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000- \u007f"'<>\\`]/u.test(value)) return false;
  const url = parse(value);
  return Boolean(
    url &&
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.origin === origin &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.href === value,
  );
}

const toBase64Url = (text: string) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, () => '-')
    .replace(/\//g, () => '_')
    .replace(/=+$/, () => '');
};
const fromBase64Url = (token: string) => {
  const binary = atob(token.replace(/-/g, () => '+').replace(/_/g, () => '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
};

/** The Gateway return page for a Wolfari web page on `origin`; throws for any other link. */
export function payosReturnUrl(page: string, origin: string): string {
  if (!isPayosWebLink(page, origin)) throw new TypeError('Invalid payOS return page');
  return origin + PAYOS_RETURN_PATH + toBase64Url(page);
}

/** The web page a return URL leads to, or undefined when it is not a valid same-origin return. */
export function payosReturnPage(value: unknown, origin: string): string | undefined {
  if (typeof value !== 'string' || !value || value.length > MAX_RETURN_URL) return undefined;
  const url = parse(value);
  if (
    !url ||
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== value ||
    !url.pathname.startsWith(PAYOS_RETURN_PATH)
  )
    return undefined;
  const token = url.pathname.slice(PAYOS_RETURN_PATH.length);
  if (!/^[A-Za-z0-9_-]{4,400}$/.test(token)) return undefined;
  try {
    const page = fromBase64Url(token);
    // One page has exactly one token: reject non-canonical encodings.
    return toBase64Url(page) === token && isPayosWebLink(page, origin) ? page : undefined;
  } catch {
    return undefined;
  }
}

/** Statuses the Gateway return page forwards; anything else arrives as UNKNOWN. */
export const payosReturnStatuses = [
  'PAID',
  'PENDING',
  'PROCESSING',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
  'UNDERPAID',
  'UNKNOWN',
] as const;
export type PayosReturnStatus = (typeof payosReturnStatuses)[number];

/** Query keys the Gateway return page appends; removed from the address bar after reading. */
export const payosReturnKeys = ['provider', 'status', 'orderCode'] as const;

/**
 * Reads the hint the Gateway return page appended. The hint only says "the payer came back from
 * payOS"; it never settles a contribution.
 */
export function readPayosReturn(search: URLSearchParams): { status: PayosReturnStatus } | null {
  if (search.get('provider') !== 'PAYOS') return null;
  const status = search.get('status') ?? '';
  return {
    status: (payosReturnStatuses as readonly string[]).includes(status)
      ? (status as PayosReturnStatus)
      : 'UNKNOWN',
  };
}
