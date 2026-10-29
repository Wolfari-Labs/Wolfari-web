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
}: {
  primary: ReactNode;
  secondary: ReactNode;
  storageKey: string;
}) {
  const [wide, setWide] = useState(false),
    [ratio] = useState(() => {
      try {
        const n = Number(window.localStorage.getItem(storageKey));
        return n >= 40 && n <= 75 ? n : 62;
      } catch {
        return 62;
      }
    });
  const ref = useRef<GroupImperativeHandle | null>(null);
  const poolTrigger = useRef<HTMLButtonElement>(null);
  const [poolOpen, setPoolOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1201px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (!wide)
    return (
      <div className={styles.stack}>
        <Button
          ref={poolTrigger}
          variant="outline"
          icon={<Icon name="packing" />}
          onClick={() => setPoolOpen(true)}
        >
          Hoạt động chưa xếp ngày
        </Button>
        {primary}
        <Drawer
          open={poolOpen}
          label="Hoạt động chưa xếp ngày"
          side="right"
          returnFocusRef={poolTrigger}
          onDismiss={() => setPoolOpen(false)}
        >
          {secondary}
        </Drawer>
      </div>
    );
  return (
    <>
      <div className={styles.reset}>
        <Button
          variant="ghost"
          size="compact"
          onClick={() => ref.current?.setLayout({ timeline: 62, pool: 38 })}
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
        className={styles.group}
      >
        <Panel id="timeline" minSize="40%" defaultSize="62%">
          {primary}
        </Panel>
        <Separator className={styles.separator} aria-label="Đổi chiều rộng lịch trình">
          <Icon name="grip" size={16} />
        </Separator>
        <Panel id="pool" minSize="25%" defaultSize="38%">
          {secondary}
        </Panel>
      </Group>
    </>
  );
}
