export function safeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}` || fallback;
  } catch {
    return fallback;
  }
}

export function postAuthReturnTo(value: string | null | undefined): string {
  const destination = safeReturnTo(value);
  try {
    const path = decodeURIComponent(new URL(destination, window.location.origin).pathname);
    return /^\/(?:login|register|forgot-password|reset-password|verify-email)\/*$/i.test(path)
      ? '/'
      : destination;
  } catch {
    return '/';
  }
}
