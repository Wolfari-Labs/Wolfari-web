import { useRef, type ReactNode, type RefObject } from 'react';
import { Drawer } from '../../../shared/components/Drawer';
import { Button } from '../../../shared/components/Button';
import { Icon, type IconName } from '../../../shared/components/Icon';
import styles from './TripSettingsOverlay.module.css';

export type TripSettingsSection =
  'information' | 'notifications' | 'export' | 'archive' | 'delete' | 'transfer';

const sections: Record<TripSettingsSection, { label: string; icon: IconName }> = {
  information: { label: 'Chỉnh sửa thông tin', icon: 'edit' },
  notifications: { label: 'Thông báo', icon: 'bell' },
  export: { label: 'Xuất plan', icon: 'download' },
  archive: { label: 'Lưu trữ chuyến đi', icon: 'archive' },
  delete: { label: 'Xóa chuyến đi', icon: 'trash' },
  transfer: { label: 'Chuyển quyền Owner', icon: 'handover' },
};

export function TripSettingsOverlay({
  open,
  tripName,
  section,
  busy,
  archived,
  onDismiss,
  returnFocusRef,
  children,
}: {
  open: boolean;
  tripName: string;
  section: TripSettingsSection;
  busy: boolean;
  archived: boolean;
  onDismiss: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { label, icon } = sections[section];
  const title = section === 'archive' && archived ? 'Mở lại chuyến đi' : label;

  return (
    <Drawer
      open={open}
      label={title}
      side="center"
      showHeader={false}
      className={`${styles.modal} ${section === 'information' || section === 'export' ? styles.wide : ''}`}
      overlayClassName={styles.backdrop ?? ''}
      initialFocusRef={headingRef}
      returnFocusRef={returnFocusRef}
      onDismiss={onDismiss}
    >
      <div className={styles.frame}>
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <Icon name={icon} size={22} />
          </span>
          <div className={styles.heading}>
            <h2 ref={headingRef} tabIndex={-1}>
              {title}
            </h2>
            <p>{tripName}</p>
          </div>
          <Button
            variant="plain"
            size="icon"
            aria-label={`Đóng ${title.toLocaleLowerCase('vi-VN')}`}
            disabled={busy}
            onClick={onDismiss}
          >
            <Icon name="close" size={20} />
          </Button>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </Drawer>
  );
}
