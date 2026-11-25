import { useId } from 'react';
import { Popover } from 'radix-ui';
import { Icon } from '../../shared/components/Icon';
import styles from './MemberRoleHelp.module.css';

export function MemberRoleHelp() {
  const titleId = useId();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Gợi ý vai trò thành viên">
          <Icon name="lightbulb" size={19} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          aria-labelledby={titleId}
          align="start"
          sideOffset={8}
          collisionPadding={16}
        >
          <div className={styles.heading}>
            <h3 id={titleId}>Vai trò trong chuyến đi</h3>
            <Popover.Close asChild>
              <button type="button" className={styles.close} aria-label="Đóng gợi ý vai trò">
                <Icon name="close" size={16} />
              </button>
            </Popover.Close>
          </div>
          <dl className={styles.roles}>
            <dt>Chủ chuyến</dt>
            <dd>Quản lý thành viên, lời mời và quyền sửa lịch trình.</dd>
            <dt>Thành viên</dt>
            <dd>Tham gia chuyến đi, sửa lịch trình khi được cấp quyền.</dd>
            <dt>Người giữ quỹ</dt>
            <dd>Quản lý quỹ nhóm, được phân công riêng.</dd>
          </dl>
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
