import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { paths } from '../../../app/route-paths';
import type { AdminSection, ShellSection, ShellSnapshot } from '../model/shell';
import { assets } from '../../../shared/assets/asset-map';
import styles from './AppShell.module.css';

const sections: { id: ShellSection; label: string; icon: keyof typeof assets }[] = [
  { id: 'overview', label: 'Tổng quan chuyến đi', icon: '4151c.svg' },
  { id: 'map', label: 'Bản đồ địa điểm', icon: 'f892f.svg' },
  { id: 'plan', label: 'Lịch trình', icon: 'ea811.svg' },
  { id: 'dress', label: 'Dress code', icon: '87597.svg' },
  { id: 'packing', label: 'Packing list', icon: '462bc.svg' },
  { id: 'members', label: 'Thành viên', icon: '46522.svg' },
  { id: 'fund', label: 'Quỹ nhóm', icon: '431b0.svg' },
  { id: 'fare', label: 'Theo dõi giá vé', icon: 'b7793.svg' },
  { id: 'settings', label: 'Cài đặt', icon: 'd379f.svg' },
];
function Icon({ file, className }: { file: keyof typeof assets; className?: string | undefined }) {
  return <img className={className} src={assets[file]} alt="" />;
}

import { Drawer } from '../../../shared/components/Drawer';
import { NavigationButton } from '../../../shared/components/NavigationButton';
import { desktopMediaQuery } from '../../../shared/styles/breakpoints';
import { AdminNavigation, AdminSidebar, AdminTopbar } from './AdminChrome';

export function AppShell({
  snapshot,
  tripLayout,
  listLayout = false,
  fullBleed = false,
  currentPath,
  section,
  onSectionChange,
  children,
  adminLayout = false,
  adminSection = 'overview',
  onAdminSectionChange = () => {},
}: {
  snapshot: ShellSnapshot | null;
  tripLayout: boolean;
  listLayout?: boolean;
  fullBleed?: boolean;
  currentPath: string;
  section: ShellSection;
  onSectionChange: (section: ShellSection) => void;
  children: ReactNode;
  adminLayout?: boolean;
  adminSection?: AdminSection;
  onAdminSectionChange?: (section: AdminSection) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const focusContentAfterClose = useRef(false);
  const viewer = snapshot?.viewer;
  const guest = snapshot !== null && viewer === null;
  const canReadTrip = snapshot?.trip?.permissions.canRead === true;
  const canReadAdmin = viewer?.systemRole === 'ADMIN';
  const home = currentPath === paths.home;
  const schedule = currentPath.endsWith('/plan');
  const selectedHeader = home
    ? 'home'
    : schedule
      ? 'schedule'
      : currentPath.startsWith('/trips')
        ? 'trips'
        : 'none';
  const drawerLabel = adminLayout
    ? 'Điều hướng Admin'
    : tripLayout
      ? 'Điều hướng chuyến đi'
      : 'Điều hướng chính';
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(desktopMediaQuery);
    const close = () => {
      if (media.matches) setDrawerOpen(false);
    };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  useEffect(() => {
    if (drawerOpen || !focusContentAfterClose.current) return;
    focusContentAfterClose.current = false;
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTop = 0;
      main.focus({ preventScroll: true });
    }
    if (typeof window.matchMedia === 'function')
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [drawerOpen]);
  const selectDestination = () => {
    focusContentAfterClose.current = drawerOpen;
    setDrawerOpen(false);
  };
  const selectTrip = (next: ShellSection) => {
    selectDestination();
    onSectionChange(next);
  };
  const selectAdmin = (next: AdminSection) => {
    selectDestination();
    onAdminSectionChange(next);
  };
  const tripNavigation = (
    <nav aria-label="Điều hướng chuyến đi">
      {sections.map((item) => (
        <NavigationButton
          key={item.id}
          className={section === item.id ? styles.selectedSection : ''}
          disabled={!canReadTrip}
          aria-label={item.label}
          selected={section === item.id}
          title={item.label}
          onClick={() => selectTrip(item.id)}
        >
          <Icon file={item.icon} />
          <span>{item.label}</span>
        </NavigationButton>
      ))}
    </nav>
  );
  const adminNavigation = (
    <AdminNavigation section={adminSection} allowed={canReadAdmin} onSectionChange={selectAdmin} />
  );
  const publicNavigation = (
    <nav aria-label="Điều hướng chính">
      <NavLink end to={paths.home} onClick={selectDestination}>
        Trang chủ
      </NavLink>
      {viewer ? (
        <>
          <NavLink to={paths.trips} onClick={selectDestination}>
            Chuyến đi của tôi
          </NavLink>
          <NavLink to={paths.profile} onClick={selectDestination}>
            Hồ sơ cá nhân
          </NavLink>
          {canReadAdmin && (
            <NavLink to={paths.admin} onClick={selectDestination}>
              Quản trị
            </NavLink>
          )}
        </>
      ) : guest ? (
        <>
          <NavLink to={paths.login} onClick={selectDestination}>
            Đăng nhập
          </NavLink>
          <NavLink to={paths.register} onClick={selectDestination}>
            Đăng ký
          </NavLink>
        </>
      ) : null}
    </nav>
  );
  return (
    <div
      className={`${styles.shell} ${adminLayout ? styles.adminShell : tripLayout || listLayout ? styles.tripShell : styles.flowShell}`}
    >
      <a className={styles.skip} href="#main-content">
        Đến nội dung chính
      </a>
      {adminLayout ? (
        <div className={styles.adminTopbar}>
          <AdminTopbar snapshot={snapshot} section={adminSection} />
        </div>
      ) : (
        <>
          <header className={styles.desktopHeader} data-node-id="135:483">
            <Link to={paths.home} aria-label="Wolfari · Trang chủ" className={styles.logo}>
              <img src={assets['44363.png']} alt="Wolfari" />
            </Link>
            <nav aria-label="Điều hướng chính" className={styles.headerNav}>
              <NavLink end to={paths.home}>
                <Icon file={selectedHeader === 'home' ? 'd4edd.svg' : '92234.svg'} />
                Trang chủ
              </NavLink>
              {guest ? (
                <button disabled>
                  <Icon file="5290c.svg" />
                  Tính năng
                </button>
              ) : (
                <Link
                  to={paths.trips}
                  aria-current={selectedHeader === 'trips' ? 'page' : undefined}
                >
                  <Icon file={selectedHeader === 'trips' ? 'ff747.svg' : '5290c.svg'} />
                  Chuyến đi của tôi
                </Link>
              )}
              {canReadTrip && snapshot?.trip ? (
                <Link
                  aria-current={schedule ? 'page' : undefined}
                  to={paths.plan(snapshot.trip.id)}
                >
                  <Icon file={schedule ? '28f71.svg' : '89e09.svg'} />
                  Lên lịch
                </Link>
              ) : (
                <button disabled title="Chọn chuyến đi để mở lịch trình">
                  <Icon file="89e09.svg" />
                  {guest ? 'Về Wolfari' : 'Lên lịch'}
                </button>
              )}
            </nav>
            <div className={styles.account}>
              {viewer ? (
                <>
                  <button className={styles.bell} disabled aria-label="Thông báo · Chưa triển khai">
                    <Icon file="0e16c.svg" />
                  </button>
                  <Link
                    to={paths.profile}
                    className={styles.profile}
                    aria-label={'Hồ sơ cá nhân · ' + viewer.fullName}
                  >
                    <span className={styles.avatar}>
                      <img src={assets['24d7e.png']} alt="" />
                    </span>
                    <span>{viewer.fullName} ⌄</span>
                  </Link>
                </>
              ) : guest ? (
                <>
                  <Link className={styles.outline} to={paths.login}>
                    Đăng nhập
                  </Link>
                  <Link className={styles.primary} to={paths.register}>
                    <Icon file="ac8db.svg" />
                    Đăng ký
                  </Link>
                </>
              ) : (
                <span aria-label="Thông tin tài khoản chưa khả dụng">—</span>
              )}
            </div>
          </header>
        </>
      )}
      <header className={styles.mobileHeader} data-node-id={tripLayout ? '325:2266' : '322:2268'}>
        <button
          className={styles.mobileMenuButton}
          aria-label={'Mở ' + drawerLabel.toLocaleLowerCase('vi')}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
          onClick={() => setDrawerOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link to={paths.home} className={styles.mobileLogo} aria-label="Wolfari · Trang chủ">
          <img src={assets['44363.png']} alt="Wolfari" />
        </Link>
        {viewer ? (
          <Link
            className={styles.mobileAccount}
            to={paths.profile}
            aria-label={'Hồ sơ cá nhân · ' + viewer.fullName}
          >
            <span className={styles.avatar}>
              <img src={assets['24d7e.png']} alt="" />
            </span>
          </Link>
        ) : guest ? (
          <Link className={styles.mobileAccount} to={paths.login} aria-label="Đăng nhập">
            <Icon file="2e748.svg" />
          </Link>
        ) : (
          <button
            className={styles.mobileAccount}
            disabled
            aria-label="Thông tin tài khoản chưa khả dụng"
          >
            —
          </button>
        )}
      </header>
      <div className={styles.layout}>
        {adminLayout ? (
          <aside className={styles.adminSidebar}>
            <AdminSidebar>{adminNavigation}</AdminSidebar>
          </aside>
        ) : tripLayout ? (
          <aside
            className={collapsed ? styles.collapsed : styles.sidebar}
            data-node-id={collapsed ? '135:1042' : '135:484'}
          >
            {tripNavigation}
            {!collapsed && (
              <div className={styles.sidebarDecoration} aria-hidden="true">
                <p>
                  Cùng bạn
                  <br />
                  đi xa hơn!
                </p>
                <img className={styles.routeDecoration} src={assets['0d2a5.svg']} alt="" />
                <img className={styles.readingMascot} src={assets['4ff86.png']} alt="" />
              </div>
            )}
            <button
              className={styles.collapseButton}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <Icon file="cea87.svg" />
              ) : (
                <>
                  <strong>«</strong>
                  <span>Thu gọn</span>
                </>
              )}
            </button>
          </aside>
        ) : null}
        <main
          id="main-content"
          tabIndex={-1}
          className={`${styles.main} ${tripLayout || adminLayout || listLayout ? styles.tripMain : styles.flowMain} ${listLayout || fullBleed ? styles.listMain : ''}`}
        >
          {children}
        </main>
      </div>
      <Drawer open={drawerOpen} label={drawerLabel} onDismiss={() => setDrawerOpen(false)}>
        {adminLayout ? adminNavigation : tripLayout ? tripNavigation : publicNavigation}
      </Drawer>
    </div>
  );
}
