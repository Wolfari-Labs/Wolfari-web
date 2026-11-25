import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import styles from './TripMapPage.module.css';

export function ExpandableMapPanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    toggleRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      toggleRef.current?.focus();
    };
  }, [expanded]);

  return (
    <>
      {expanded && (
        <div
          className={styles.mapOverlayBackdrop}
          aria-hidden="true"
          onClick={() => setExpanded(false)}
        />
      )}
      <section
        ref={panelRef}
        className={`${styles.mapPanel} ${styles.expandableMapPanel} ${expanded ? styles.mapPanelExpanded : ''}`}
        aria-labelledby="map-panel-title"
        aria-modal={expanded ? true : undefined}
        role={expanded ? 'dialog' : undefined}
        data-region="map-panel"
      >
        <button
          ref={toggleRef}
          type="button"
          className={styles.mapExpandButton}
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
          title={expanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
        >
          {expanded ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
        </button>
        {children}
      </section>
    </>
  );
}
