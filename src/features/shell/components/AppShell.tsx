import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, NavLink } from 'react-router';
import { paths } from '../../../app/route-paths';
import type { AdminSection, ShellSection, ShellSnapshot } from '../model/shell';
import type { assets } from '../../../shared/assets/asset-map';
import logo from '../../../shared/assets/figma/44363.png';
import routeDecoration from '../../../shared/assets/figma/0d2a5.svg';
import mascot from '../../../shared/assets/figma/4ff86.png';
import styles from './AppShell.module.css';
import { Icon as UiIcon, type IconName } from '../../../shared/components/Icon';
import { Avatar } from '../../../shared/components/Avatar';
import { useAnimate } from 'motion/react-mini';

const Notifications = lazy(() =>
  import('../../notifications/Notifications').then((module) => ({ default: module.Notifications })),
);
const AccountMenu = lazy(() =>
  import('./AccountMenu').then((module) => ({ default: module.AccountMenu })),
);
const NavigationDrawer = lazy(() =>
  import('../../../shared/components/Drawer').then((module) => ({ default: module.Drawer })),
);

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
  const names: Partial<Record<keyof typeof assets, IconName>> = {
    '4151c.svg': 'home',
    'f892f.svg': 'map',
    'ea811.svg': 'plan',
    '87597.svg': 'dress',
    '462bc.svg': 'packing',
    '46522.svg': 'members',
    '431b0.svg': 'fund',
    'b7793.svg': 'price',
    'd379f.svg': 'settings',
    'd4edd.svg': 'home',
    '92234.svg': 'home',
    '5290c.svg': 'plan',
    'ff747.svg': 'plan',
    '28f71.svg': 'plan',
    '89e09.svg': 'plan',
    'ac8db.svg': 'price',
    '2e748.svg': 'user',
    'cea87.svg': 'expand',
    '0e16c.svg': 'bell',
  };
  const name = names[file];
  return <UiIcon name={name ?? 'info'} {...(className ? { className } : {})} />;
}

import { NavigationButton } from '../../../shared/components/NavigationButton';
import { desktopMediaQuery } from '../../../shared/styles/breakpoints';
import { AdminNavigation, AdminSidebar, AdminTopbar } from './AdminChrome';

export function AppShell({
  snapshot,
  tripLayout,
  listLayout = false,
  fullBleed = false,
  currentPath,
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
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const desktopSidebar = useRef<HTMLElement>(null);
  const [contentScope, animateContent] = useAnimate<HTMLElement>();
  const animatedPath = useRef(currentPath);
  useEffect(() => {
    // Initial content is visible immediately; animate only subsequent navigation.
    if (animatedPath.current === currentPath) return;
    animatedPath.current = currentPath;
    if (
      !contentScope.current ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const animation = animateContent(
      contentScope.current,
      { opacity: [0.8, 1], transform: ['translateY(5px)', 'none'] },
      { duration: 0.16, ease: 'easeOut' },
    );
    return () => animation.stop();
  }, [currentPath, animateContent, contentScope]);
  const focusContentAfterClose = useRef(false);
  const viewer = snapshot?.viewer;
  // Public flows should never render a disabled placeholder while the session
  // check is still settling. Treat the shell as guest until a real viewer is
  // available; private routes are guarded by App before their content mounts.
  const guest = !viewer && !tripLayout && !adminLayout;
  const canReadTrip = snapshot?.trip?.permissions.canRead === true;
  const canReadAdmin = viewer?.systemRole === 'ADMIN';
  const home = currentPath === paths.home;
  const schedule = currentPath.endsWith('/plan');
  const dressRoute = currentPath.endsWith('/dress-code');
  const selectedHeader = home
    ? 'home'
    : schedule
      ? 'schedule'
      : currentPath.startsWith('/trips')
        ? 'trips'
        : 'none';
  useLayoutEffect(() => {
    if (!tripLayout || !canReadTrip) return;
    const nav = desktopSidebar.current?.querySelector('nav');
    const active = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !active) return;
    const navBounds = nav.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.bottom > navBounds.bottom)
      nav.scrollTop += activeBounds.bottom - navBounds.bottom;
    else if (activeBounds.top < navBounds.top) nav.scrollTop -= navBounds.top - activeBounds.top;
  }, [canReadTrip, collapsed, currentPath, tripLayout]);
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
  const tripPath = (id: ShellSection) => {
    if (!snapshot?.trip) return null;
    const tripId = snapshot.trip.id;
    return {
      overview: paths.trip(tripId),
      map: paths.map(tripId),
      plan: paths.plan(tripId),
      dress: paths.dressCode(tripId),
      packing: paths.packing(tripId),
      members: paths.members(tripId),
      fund: paths.fund(tripId),
      fare: paths.priceWatch(tripId),
      settings: paths.settings(tripId),
      tools: null,
    }[id];
  };
  const selectAdmin = (next: AdminSection) => {
    selectDestination();
    onAdminSectionChange(next);
  };
  const tripNavigation = (
    <nav aria-label="Điều hướng chuyến đi">
      {sections.map((item) =>
        tripPath(item.id) && canReadTrip ? (
          <NavLink
            key={item.id}
            end={item.id === 'overview'}
            to={tripPath(item.id)!}
            className={({ isActive }) => (isActive ? styles.selectedSection : '')}
            aria-label={item.label}
            title={item.label}
            onClick={selectDestination}
          >
            <Icon file={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ) : (
          <NavigationButton
            key={item.id}
            disabled
            selected={false}
            aria-label={`${item.label} · Chưa khả dụng`}
            title={`${item.label} · Chưa khả dụng`}
            onClick={() => selectTrip(item.id)}
          >
            <Icon file={item.icon} />
            <span>{item.label}</span>
          </NavigationButton>
        ),
      )}
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
  const mobileMenu = (
    <button
      ref={menuTrigger}
      className={styles.mobileMenuButton}
      aria-label={'Mở ' + drawerLabel.toLocaleLowerCase('vi')}
      aria-expanded={drawerOpen}
      aria-haspopup="dialog"
      onClick={() => {
        setDrawerLoaded(true);
        setDrawerOpen(true);
      }}
    >
      {adminLayout ? <UiIcon name="menu" /> : 'Menu'}
    </button>
  );
  return (
    <div
      className={`${styles.shell} ${dressRoute ? styles.dressRoute : ''} ${adminLayout ? styles.adminShell : tripLayout || listLayout ? styles.tripShell : styles.flowShell}`}
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
              <img src={logo} alt="Wolfari" />
            </Link>
            <nav aria-label="Điều hướng chính" className={styles.headerNav}>
              <NavLink end to={paths.home}>
                <Icon file={selectedHeader === 'home' ? 'd4edd.svg' : '92234.svg'} />
                Trang chủ
              </NavLink>
              {guest ? (
                <a href={`${paths.home}#home-features`}>
                  <Icon file="5290c.svg" />
                  Tính năng
                </a>
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
              ) : guest ? (
                <a href={`${paths.home}#home-about`}>
                  <UiIcon name="info" />
                  Về Wolfari
                </a>
              ) : (
                <button disabled title="Chọn chuyến đi để mở lịch trình">
                  <Icon file="89e09.svg" />
                  Lên lịch
                </button>
              )}
            </nav>
            <div className={styles.account}>
              {viewer ? (
                <>
                  <Suspense
                    fallback={<span className={styles.bellPlaceholder} aria-hidden="true" />}
                  >
                    <Notifications key={viewer.id ?? 'preview'} actor={viewer.id ?? 'preview'} />
                  </Suspense>
                  <Suspense
                    fallback={
                      <Link
                        to={paths.profile}
                        className={styles.profile}
                        aria-label={'Hồ sơ cá nhân · ' + viewer.fullName}
                      >
                        <Avatar name={viewer.fullName} />
                        <span className={styles.accountName}>{viewer.fullName}</span>
                      </Link>
                    }
                  >
                    <AccountMenu name={viewer.fullName} />
                  </Suspense>
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
      <header
        className={`${styles.mobileHeader} ${adminLayout ? styles.adminMobileHeader : ''}`}
        data-node-id={adminLayout ? undefined : '779:6442'}
      >
        {adminLayout && mobileMenu}
        <Link to={paths.home} className={styles.mobileLogo} aria-label="Wolfari · Trang chủ">
          <img src={logo} alt="Wolfari" />
        </Link>
        {viewer ? (
          <div className={styles.mobileAccountActions}>
            <Suspense fallback={<span className={styles.bellPlaceholder} aria-hidden="true" />}>
              <Notifications key={viewer.id ?? 'preview'} actor={viewer.id ?? 'preview'} />
            </Suspense>
            <Link
              className={styles.mobileAccount}
              to={paths.profile}
              aria-label={'Hồ sơ cá nhân · ' + viewer.fullName}
            >
              <Avatar name={viewer.fullName} />
            </Link>
          </div>
        ) : guest ? null : (
          <button
            className={styles.mobileAccount}
            disabled
            aria-label="Thông tin tài khoản chưa khả dụng"
          >
            —
          </button>
        )}
        {!adminLayout && mobileMenu}
      </header>
      <div className={styles.layout}>
        {adminLayout ? (
          <aside className={styles.adminSidebar}>
            <AdminSidebar>{adminNavigation}</AdminSidebar>
          </aside>
        ) : tripLayout ? (
          <aside
            ref={desktopSidebar}
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
                <img className={styles.routeDecoration} src={routeDecoration} alt="" />
                <img className={styles.readingMascot} src={mascot} alt="" />
              </div>
            )}
            <button
              className={styles.collapseButton}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <Icon file="cea87.svg" className={styles.collapseIconReversed} />
              ) : (
                <>
                  <UiIcon name="collapse" />
                  <span>Thu gọn</span>
                </>
              )}
            </button>
          </aside>
        ) : null}
        <main
          ref={contentScope}
          id="main-content"
          tabIndex={-1}
          className={`${styles.main} ${tripLayout || adminLayout || listLayout ? styles.tripMain : styles.flowMain} ${listLayout || fullBleed ? styles.listMain : ''}`}
        >
          {children}
        </main>
      </div>
      {drawerLoaded && (
        <Suspense fallback={null}>
          <NavigationDrawer
            open={drawerOpen}
            label={drawerLabel}
            returnFocusRef={menuTrigger}
            onDismiss={() => setDrawerOpen(false)}
            {...(!adminLayout
              ? {
                  className: styles.navigationDrawer,
                  showHeader: false,
                  initialFocusRef: drawerClose,
                }
              : {})}
          >
            {!adminLayout && (
              <div className={styles.drawerHeader}>
                <Link to={paths.home} aria-label="Wolfari · Trang chủ" onClick={selectDestination}>
                  <img src={logo} alt="Wolfari" />
                </Link>
                <button
                  ref={drawerClose}
                  className={styles.drawerClose}
                  aria-label={'Đóng ' + drawerLabel.toLocaleLowerCase('vi')}
                  onClick={() => setDrawerOpen(false)}
                >
                  Đóng
                </button>
              </div>
            )}
            {adminLayout ? adminNavigation : tripLayout ? tripNavigation : publicNavigation}
            {tripLayout && (
              <div className={styles.drawerDecoration} aria-hidden="true">
                <p>
                  Cùng bạn
                  <br />
                  đi xa hơn!
                </p>
                <img src={routeDecoration} alt="" className={styles.drawerRoute} />
                <img src={mascot} alt="" className={styles.drawerMascot} />
              </div>
            )}
          </NavigationDrawer>
        </Suspense>
      )}
    </div>
  );
}
