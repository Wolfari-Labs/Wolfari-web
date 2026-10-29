import { DropdownMenu } from 'radix-ui';
import { Link } from 'react-router';
import { paths } from '../../../app/route-paths';
import { Avatar } from '../../../shared/components/Avatar';
import { Icon } from '../../../shared/components/Icon';
import styles from './AppShell.module.css';
import ui from '../../../shared/components/Ui.module.css';

export function AccountMenu({ name }: { name: string }) {
  return (
    <DropdownMenu.Root>
      <div className={styles.profileGroup}>
        <Link to={paths.profile} className={styles.profile} aria-label={'Hồ sơ cá nhân · ' + name}>
          <Avatar name={name} />
          <span className={styles.accountName}>{name}</span>
        </Link>
        <DropdownMenu.Trigger className={styles.profileChevron} aria-label="Mở menu tài khoản">
          <Icon name="chevron" size={16} />
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={ui.menu} align="end" sideOffset={10}>
          <DropdownMenu.Item asChild className={ui.menuItem}>
            <Link to={paths.profile}>
              <Icon name="user" />
              Hồ sơ cá nhân
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={ui.menuItem}>
            <Link to={paths.trips}>
              <Icon name="plan" />
              Chuyến đi của tôi
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={ui.menuItem}>
            <Link to={`${paths.profile}#notifications`}>
              <Icon name="bell" />
              Tùy chọn thông báo
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
