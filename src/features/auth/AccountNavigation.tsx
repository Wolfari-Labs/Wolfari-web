import type { ReactNode } from 'react';
import { Bell, ShieldCheck, UserRound } from 'lucide-react';
import styles from './AccountNavigation.module.css';

export type AccountSection = 'personal' | 'security' | 'notifications';

const sections = [
  { id: 'personal', label: 'Thông tin cá nhân', icon: UserRound },
  { id: 'security', label: 'Bảo mật và đăng nhập', icon: ShieldCheck },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
] as const;

export function AccountNavigation({
  active,
  onChange,
  disabled = false,
  footer,
}: {
  active: AccountSection;
  onChange: (section: AccountSection) => void;
  disabled?: boolean;
  footer?: ReactNode;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Hồ sơ cá nhân">
      <h1 className={styles.heading}>Hồ sơ cá nhân</h1>
      <nav className={styles.navigation} aria-label="Điều hướng tài khoản">
        {sections.map(({ id, label, icon: SectionIcon }) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            aria-pressed={active === id}
            disabled={disabled}
            onClick={() => onChange(id)}
          >
            <SectionIcon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {footer && <div className={styles.footer}>{footer}</div>}
    </aside>
  );
}
