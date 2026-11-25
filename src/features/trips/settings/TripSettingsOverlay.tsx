import { useRef, type ReactNode, type RefObject } from 'react';
import { Drawer } from '../../../shared/components/Drawer';
import { Button } from '../../../shared/components/Button';
import { Icon, type IconName } from '../../../shared/components/Icon';
import styles from './TripSettingsOverlay.module.css';

export type TripSettingsSection = 'information' | 'notifications' | 'export' | 'archive';

const sections: readonly { id: TripSettingsSection; label: string; icon: IconName }[] = [
  { id: 'information', label: 'Chỉnh sửa thông tin', icon: 'edit' },
  { id: 'notifications', label: 'Thông báo', icon: 'bell' },
  { id: 'export', label: 'Xuất plan', icon: 'fileText' },
  { id: 'archive', label: 'Lưu trữ chuyến đi', icon: 'history' },
];

export function TripSettingsOverlay({
  open,
  tripName,
  section,
  busy,
  owner,
  onSectionChange,
  onDismiss,
  returnFocusRef,
  children,
}: {
  open: boolean;
  tripName: string;
  section: TripSettingsSection;
  busy: boolean;
  owner: boolean;
  onSectionChange: (section: TripSettingsSection) => void;
  onDismiss: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <Drawer
      open={open}
      label="Cài đặt chuyến đi"
      side="center"
      showHeader={false}
      className={styles.modal ?? ''}
      overlayClassName={styles.backdrop ?? ''}
      initialFocusRef={headingRef}
      returnFocusRef={returnFocusRef}
      onDismiss={onDismiss}
    >
      <div className={styles.frame}>
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <Icon name="settings" size={22} />
          </span>
          <div className={styles.heading}>
            <h2 ref={headingRef} tabIndex={-1}>
              Cài đặt chuyến đi
            </h2>
            <p>{tripName}</p>
          </div>
          <Button
            variant="plain"
            size="icon"
            aria-label="Đóng cài đặt chuyến đi"
            disabled={busy}
            onClick={onDismiss}
          >
            <Icon name="close" size={20} />
          </Button>
        </header>
        <div className={styles.body}>
          <nav className={styles.navigation} aria-label="Mục cài đặt chuyến đi">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={section === item.id}
                disabled={busy || (item.id === 'archive' && !owner)}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </Drawer>
  );
}
