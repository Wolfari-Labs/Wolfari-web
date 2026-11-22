import { useEffect, type RefObject } from 'react';

/**
 * Fades `[data-reveal]` blocks in as they scroll into view. Content is visible by default: only
 * blocks that start below the fold are hidden, and only when IntersectionObserver exists and the
 * viewer has not asked for reduced motion. Anything still hidden is shown on unmount and before
 * printing, so the page never depends on the observer firing.
 */
export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const fold = window.innerHeight;
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
      (element) => element.getBoundingClientRect().top > fold * 0.92,
    );
    if (targets.length === 0) return;
    const show = (element: Element) => element.setAttribute('data-reveal', 'shown');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    for (const element of targets) {
      element.setAttribute('data-reveal', 'pending');
      observer.observe(element);
    }
    const showAll = () => targets.forEach(show);
    window.addEventListener('beforeprint', showAll);
    return () => {
      observer.disconnect();
      window.removeEventListener('beforeprint', showAll);
      showAll();
    };
  }, [root]);
}
