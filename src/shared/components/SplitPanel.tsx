import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, type GroupImperativeHandle } from 'react-resizable-panels';
import { Icon } from './Icon';
import { Button } from './Button';
import { Drawer } from './Drawer';
import styles from './SplitPanel.module.css';
export function SplitPanel({
  primary,
  secondary,
  storageKey,
  secondaryLabel = 'Hoạt động chưa xếp ngày',
  initialSecondaryOpen = false,
  onSecondaryDismiss,
  variant = 'default',
}: {
  primary: ReactNode;
  secondary: ReactNode;
  storageKey: string;
  secondaryLabel?: string;
  initialSecondaryOpen?: boolean;
  onSecondaryDismiss?: () => void;
  variant?: 'default' | 'itinerary';
}) {
  const defaultRatio = variant === 'itinerary' ? (680 / 1168) * 100 : 62;
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1201px)').matches),
    [ratio] = useState(() => {
      try {
        const n = Number(window.localStorage.getItem(storageKey));
        return n >= 40 && n <= 75 ? n : defaultRatio;
      } catch {
        return defaultRatio;
      }
    });
  const ref = useRef<GroupImperativeHandle | null>(null);
  const poolTrigger = useRef<HTMLButtonElement>(null);
  const [poolOpen, setPoolOpen] = useState(initialSecondaryOpen);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1201px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // The resizable group needs a browser layout observer. Keep the itinerary
  // usable in non-layout environments (SSR/jsdom) with the same drawer model;
  // real browsers retain the desktop split and resize affordance.
  const canRenderResizableItinerary =
    variant !== 'itinerary' || typeof ResizeObserver !== 'undefined';
  if (!wide || !canRenderResizableItinerary)
    return (
      <div className={styles.stack}>
        <Button
          ref={poolTrigger}
          variant="outline"
          icon={<Icon name="packing" />}
          onClick={() => setPoolOpen(true)}
        >
          {secondaryLabel}
        </Button>
        {primary}
        <Drawer
          open={poolOpen}
          label={secondaryLabel}
          side="right"
          returnFocusRef={poolTrigger}
          onDismiss={() => {
            setPoolOpen(false);
            onSecondaryDismiss?.();
          }}
        >
          {secondary}
        </Drawer>
      </div>
    );
  return (
    <>
      <div className={styles.reset} hidden={variant === 'itinerary'}>
        <Button
          variant="ghost"
          size="compact"
          onClick={() =>
            ref.current?.setLayout({ timeline: defaultRatio, pool: 100 - defaultRatio })
          }
        >
          Khôi phục tỷ lệ panel
        </Button>
      </div>
      <Group
        groupRef={ref}
        orientation="horizontal"
        defaultLayout={{ timeline: ratio, pool: 100 - ratio }}
        onLayoutChanged={(layout) => {
          try {
            window.localStorage.setItem(storageKey, String(layout.timeline));
          } catch {
            /* Layout preferences never block editing. */
          }
        }}
        className={`${styles.group} ${variant === 'itinerary' ? styles.itinerary : ''}`}
      >
        <Panel id="timeline" minSize="40%" defaultSize={`${defaultRatio}%`}>
          {primary}
        </Panel>
        <Separator
          className={styles.separator}
          aria-label="Đổi chiều rộng lịch trình"
          title="Kéo để đổi tỷ lệ. Nhấn Home hoặc nhấp đúp để khôi phục."
          onDoubleClick={() =>
            ref.current?.setLayout({ timeline: defaultRatio, pool: 100 - defaultRatio })
          }
          onKeyDown={(event) => {
            if (variant === 'itinerary' && event.key === 'Home') {
              event.preventDefault();
              ref.current?.setLayout({ timeline: defaultRatio, pool: 100 - defaultRatio });
            }
          }}
        >
          <Icon name="grip" size={16} />
        </Separator>
        <Panel id="pool" minSize="25%" defaultSize={`${100 - defaultRatio}%`}>
          {secondary}
        </Panel>
      </Group>
    </>
  );
}
