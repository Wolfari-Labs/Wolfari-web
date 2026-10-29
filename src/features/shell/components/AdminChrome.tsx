import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { paths } from '../../../app/route-paths';
import type { AdminSection, ShellSnapshot } from '../model/shell';
import logo from '../../../shared/assets/figma/44363.png';
import adminMascot from '../../../shared/assets/figma/24d7e.png';
import { NavigationButton } from '../../../shared/components/NavigationButton';
import styles from './AdminChrome.module.css';
import adminBell from '../../../shared/assets/figma/06423.svg';

export const adminSections: { id: AdminSection; label: string; letter: string }[] = [
  { id: 'overview', label: 'Tổng quan', letter: 'T' },
  { id: 'accounts', label: 'Tài khoản', letter: 'N' },
  { id: 'providers', label: 'Tích hợp', letter: 'P' },
  { id: 'monitoring', label: 'Giám sát', letter: 'G' },
  { id: 'audit', label: 'Audit & hỗ trợ', letter: 'A' },
  { id: 'configuration', label: 'Cấu hình', letter: 'C' },
];
export function AdminNavigation({
  section,
  allowed,
  onSectionChange,
}: {
  section: AdminSection;
  allowed: boolean;
  onSectionChange: (section: AdminSection) => void;
}) {
  return (
    <nav aria-label="Điều hướng Admin">
      {adminSections.map((item) => (
        <NavigationButton
          key={item.id}
          disabled={!allowed}
          selected={section === item.id}
          onClick={() => onSectionChange(item.id)}
        >
          <span className={styles.marker} />
          <span className={styles.badge} aria-hidden="true">
            {item.letter}
          </span>
          {item.label}
        </NavigationButton>
      ))}
    </nav>
  );
}
export function AdminSidebar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sidebar} data-node-id="197:1074">
      <div className={styles.brand}>
        <Link to={paths.home} aria-label="Wolfari · Trang chủ">
          <img src={logo} alt="Wolfari" />
        </Link>
        <span>
          TRUNG TÂM
          <br />
          <strong>QUẢN TRỊ</strong>
        </span>
      </div>
      {children}
      <div className={styles.reminder}>
        <img src={adminMascot} alt="" />
        <p>
          Quản trị hệ thống
          <br />
          <span>không thay quyền trong Trip</span>
        </p>
      </div>
    </div>
  );
}
export function AdminTopbar({
  snapshot,
  section,
}: {
  snapshot: ShellSnapshot | null;
  section: AdminSection;
}) {
  const viewer = snapshot?.viewer;
  return (
    <header className={styles.topbar} data-node-id="194:1085">
      <span>Quản trị / {adminSections.find((item) => item.id === section)?.label}</span>
      <div className={styles.actions}>
        <button disabled aria-label="Thông báo Admin · Chưa triển khai">
          <img src={adminBell} alt="" />
        </button>
        <span className={styles.avatar} aria-hidden="true">
          A
        </span>
        {viewer && (
          <Link to={paths.profile}>
            {viewer.fullName}
            {viewer.systemRole === 'ADMIN' ? ' · Admin' : ''}
          </Link>
        )}
      </div>
    </header>
  );
}
