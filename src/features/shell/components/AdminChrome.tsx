import { Link } from 'react-router';
import type { ReactNode } from 'react';
import {
  Bell,
  ClipboardList,
  Clock,
  Compass,
  Info,
  Link2,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '../../../app/route-paths';
import type { AdminSection, ShellSnapshot } from '../model/shell';
import { BrandWordmark } from '../../../shared/components/BrandWordmark';
import { NavigationButton } from '../../../shared/components/NavigationButton';
import styles from './AdminChrome.module.css';

// Web v2 W/Admin sidebar (Figma 937:8030): one line glyph per section instead of letter badges.
export const adminSections: {
  id: AdminSection;
  label: string;
  letter: string;
  icon: LucideIcon;
}[] = [
  { id: 'overview', label: 'Tổng quan', letter: 'T', icon: Compass },
  { id: 'accounts', label: 'Tài khoản', letter: 'N', icon: Users },
  { id: 'providers', label: 'Tích hợp', letter: 'P', icon: Link2 },
  { id: 'monitoring', label: 'Giám sát', letter: 'G', icon: Clock },
  { id: 'audit', label: 'Audit & hỗ trợ', letter: 'A', icon: ClipboardList },
  { id: 'configuration', label: 'Cấu hình', letter: 'C', icon: Tag },
];
export function AdminPlaceholder() {
  return (
    <section className={styles.placeholder} role="status">
      <h2>Chức năng quản trị chưa khả dụng</h2>
      <p>
        Các mục quản trị chưa được triển khai. Vai trò Admin không tự cấp quyền xem hoặc chỉnh sửa
        chuyến đi.
      </p>
    </section>
  );
}
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
    <nav aria-label="Điều hướng Admin" className={styles.navigation}>
      {adminSections.map((item) => (
        <NavigationButton
          key={item.id}
          disabled={!allowed}
          selected={section === item.id}
          onClick={() => onSectionChange(item.id)}
        >
          <item.icon className={styles.navIcon} size={20} strokeWidth={1.8} aria-hidden="true" />
          {item.label}
        </NavigationButton>
      ))}
    </nav>
  );
}
export function AdminSidebar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.sidebar} data-node-id="937:8030">
      <div className={styles.brand}>
        <Link to={paths.home} aria-label="Wolfari · Trang chủ">
          <BrandWordmark />
        </Link>
        <span className={styles.brandTag}>WEB ADMIN</span>
      </div>
      <p className={styles.sectionLabel}>QUẢN TRỊ</p>
      {children}
      <div className={styles.reminder}>
        <p className={styles.reminderTitle}>
          <Info size={16} strokeWidth={2} aria-hidden="true" />
          Phạm vi Admin
        </p>
        <p>Quản trị hệ thống không thay quyền trong Trip.</p>
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
    <header className={styles.topbar} data-node-id="937:8031">
      <div className={styles.topbarTitle}>
        <span>{adminSections.find((item) => item.id === section)?.label}</span>
        <span>Wolfari · System Admin</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.bell} disabled aria-label="Thông báo Admin · Chưa triển khai">
          <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            A
          </span>
          {viewer && (
            <Link to={paths.profile}>
              {viewer.fullName}
              {viewer.systemRole === 'ADMIN' ? ' · Admin' : ''}
            </Link>
          )}
        </span>
      </div>
    </header>
  );
}
