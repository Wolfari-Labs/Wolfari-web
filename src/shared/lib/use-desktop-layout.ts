import { useSyncExternalStore } from 'react';
import { desktopMediaQuery } from '../styles/breakpoints';

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(desktopMediaQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function snapshot() {
  // Without matchMedia (jsdom) the desktop layout is the reference.
  return typeof window.matchMedia !== 'function'
    ? true
    : window.matchMedia(desktopMediaQuery).matches;
}

/**
 * True for the web desktop layout (>= 769px, `desktopMediaQuery`). The mobile layout is deferred, so
 * a few page headers keep their previous markup below this width instead of adopting the shared one.
 */
export function useDesktopLayout(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
