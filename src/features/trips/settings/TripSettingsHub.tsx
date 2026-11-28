import type { MouseEvent } from 'react';
import { Icon, type IconName } from '../../../shared/components/Icon';
import type { TripSettingsSection } from './TripSettingsOverlay';
import styles from './TripSettingsHub.module.css';

const functions: readonly {
  section: TripSettingsSection;
  title: string;
  description: string;
  icon: IconName;
  tone: string;
}[] = [
  {
    section: 'information',
    title: 'Chỉnh sửa thông tin',
    description: 'Cập nhật tên, thời gian, ảnh và mô tả chuyến đi.',
    icon: 'edit',
    tone: 'blue',
  },
  {
    section: 'notifications',
    title: 'Thông báo',
    description: 'Thiết lập và quản lý các lời nhắc cho chuyến đi.',
    icon: 'bell',
    tone: 'green',
  },
  {
    section: 'export',
    title: 'Xuất plan',
    description: 'Tải kế hoạch chuyến đi để xem ngoại tuyến hoặc chia sẻ.',
    icon: 'download',
    tone: 'amber',
  },
  {
    section: 'archive',
    title: 'Lưu trữ chuyến đi',
    description: 'Lưu chuyến đi vào kho lưu trữ để gọn gàng hơn.',
    icon: 'archive',
    tone: 'violet',
  },
  {
    section: 'delete',
    title: 'Xóa chuyến đi',
    description: 'Xóa chuyến đi và dữ liệu liên quan.',
    icon: 'trash',
    tone: 'coral',
  },
];

export function TripSettingsHub({
  owner,
  archived,
  onOpen,
}: {
  owner: boolean;
  archived: boolean;
  onOpen: (section: TripSettingsSection, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className={styles.hub}>
      <header className={styles.heading}>
        <span className={styles.headingIcon} aria-hidden="true">
          <Icon name="settings" size={22} />
        </span>
        <div>
          <h2>Cài đặt chuyến đi</h2>
          <p>Quản lý và tùy chỉnh các chức năng cho chuyến đi này.</p>
        </div>
      </header>
      <div className={styles.grid}>
        {functions.map((item) => {
          const title = item.section === 'archive' && archived ? 'Mở lại chuyến đi' : item.title;
          const description =
            item.section === 'archive' && archived
              ? 'Mở lại chuyến đi đã lưu trữ để tiếp tục lên kế hoạch.'
              : item.description;
          const disabled = !owner && (item.section === 'archive' || item.section === 'delete');
          return (
            <button
              key={item.section}
              id={`trip-settings-${item.section}`}
              type="button"
              className={styles.tile}
              data-tone={item.tone}
              data-section={item.section}
              aria-labelledby={`trip-settings-${item.section}-title`}
              aria-describedby={`trip-settings-${item.section}-description`}
              disabled={disabled}
              onClick={(event: MouseEvent<HTMLButtonElement>) =>
                onOpen(item.section, event.currentTarget)
              }
            >
              <span className={styles.tileIcon} aria-hidden="true">
                <Icon name={item.icon} size={30} />
              </span>
              <span className={styles.copy}>
                <strong id={`trip-settings-${item.section}-title`}>{title}</strong>
                <span id={`trip-settings-${item.section}-description`}>
                  {disabled ? 'Chỉ chủ chuyến đi có thể thực hiện chức năng này.' : description}
                </span>
              </span>
              <span className={styles.arrow} aria-hidden="true">
                <Icon name="chevronRight" size={21} />
              </span>
              <span className={styles.illustration} aria-hidden="true">
                <Icon
                  name={
                    item.section === 'information' || item.section === 'export'
                      ? 'fileText'
                      : item.icon
                  }
                  size={92}
                  strokeWidth={1.4}
                />
                {item.section === 'information' && (
                  <Icon name="edit" className={styles.illustrationPencil ?? ''} size={48} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
