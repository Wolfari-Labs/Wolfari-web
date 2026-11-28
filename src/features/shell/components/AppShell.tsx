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
import mascot from '../../../shared/assets/v2/mascot-waving.png';
import { BrandWordmark } from '../../../shared/components/BrandWordmark';
import styles from './AppShell.module.css';
import { Icon as UiIcon } from '../../../shared/components/Icon';
import { FigmaTopIcon, FigmaTripIcon } from '../../../shared/components/FigmaNavigationIcon';
import expandIcon from '../../../shared/assets/figma/shell/26153.svg';
import { Avatar } from '../../../shared/components/Avatar';
import { useAnimate } from 'motion/react-mini';
import { NavigationButton } from '../../../shared/components/NavigationButton';
import { desktopMediaQuery } from '../../../shared/styles/breakpoints';
import { AdminNavigation, AdminSidebar, AdminTopbar } from './AdminChrome';
import { useAvatarImage } from '../../auth/use-avatar-image';

const Notifications = lazy(() =>
  import('../../notifications/Notifications').then((module) => ({ default: module.Notifications })),
);
const AccountMenu = lazy(() =>
  import('./AccountMenu').then((module) => ({ default: module.AccountMenu })),
);
const NavigationDrawer = lazy(() =>
  import('../../../shared/components/Drawer').then((module) => ({ default: module.Drawer })),
);

// Web v2 trip sidebar (Figma 930:7331): labels and glyphs follow the V2 components.
const sections: { id: Exclude<ShellSection, 'tools'>; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'map', label: 'Bản đồ & địa điểm' },
  { id: 'plan', label: 'Lịch trình' },
  { id: 'dress', label: 'Dress code' },
  { id: 'packing', label: 'Hành lý' },
  { id: 'members', label: 'Thành viên' },
  { id: 'fund', label: 'Quỹ nhóm' },
  { id: 'fare', label: 'Theo dõi giá vé' },
  { id: 'settings', label: 'Cài đặt' },
];

function MascotCard({ className }: { className?: string | undefined }) {
  return (
    <div className={className} aria-hidden="true">
      <img src={mascot} alt="" width="96" height="80" />
      <p>Cùng bạn đi xa hơn!</p>
      <span>Mỗi chuyến đi là một câu chuyện.</span>
    </div>
  );
}

function accountInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi');
}

function profileLabel(name: string) {
  const initials = accountInitials(name);
  return initials ? `${initials} ${name} · Hồ sơ cá nhân` : `${name} · Hồ sơ cá nhân`;
}

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
  const { src: viewerAvatarSrc } = useAvatarImage({
    userId: viewer?.id,
    version: viewer?.version,
    enabled: viewer?.hasAvatar === true,
  });
  const viewerAvatarImage =
    viewerAvatarSrc && viewer ? { src: viewerAvatarSrc, alt: viewer.fullName } : null;
  // Public flows should never render a disabled placeholder while the session
  // check is still settling. Treat the shell as guest until a real viewer is
  // available; private routes are guarded by App before their content mounts.
  const guest = !viewer && !tripLayout && !adminLayout;
  const canReadTrip = snapshot?.trip?.permissions.canRead === true;
  const canReadAdmin = viewer?.systemRole === 'ADMIN';
  const home = currentPath === paths.home;
  const creatingTrip = currentPath === paths.newTrip;
  const dressRoute = currentPath.endsWith('/dress-code');
  const selectedHeader = home
    ? 'home'
    : creatingTrip
      ? 'create'
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
  const tripNavigation = (includeAccountLinks = false) => (
    <nav aria-label="Điều hướng chuyến đi">
      {includeAccountLinks && viewer && (
        <>
          <NavLink end to={paths.trips} onClick={selectDestination}>
            <UiIcon name="luggage" />
            <span>Chuyến đi của tôi</span>
          </NavLink>
          <NavLink to={paths.profile} onClick={selectDestination}>
            <UiIcon name="user" />
            <span>Hồ sơ cá nhân</span>
          </NavLink>
        </>
      )}
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
            {({ isActive }) => (
              <>
                <FigmaTripIcon section={item.id} active={isActive} />
                <span>{item.label}</span>
              </>
            )}
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
            <FigmaTripIcon section={item.id} />
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
      aria-label={
        adminLayout
          ? 'Mở ' + drawerLabel.toLocaleLowerCase('vi')
          : 'Menu · Mở ' + drawerLabel.toLocaleLowerCase('vi')
      }
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
  const desktopHeader = (
    <header
      className={styles.desktopHeader}
      data-node-id={
        guest
          ? '930:6661'
          : selectedHeader === 'create'
            ? '930:6790'
            : selectedHeader === 'trips'
              ? '930:6745'
              : '930:6700'
      }
    >
      <Link to={paths.home} aria-label="Wolfari · Trang chủ" className={styles.logo}>
        <BrandWordmark />
      </Link>
      <nav aria-label="Điều hướng chính" className={styles.headerNav}>
        <Link to={paths.home} aria-current={!guest && home ? 'page' : undefined}>
          <FigmaTopIcon section="home" active={!guest && home} />
          <span className={styles.navLabel}>Trang chủ</span>
        </Link>
        <Link to={paths.trips} aria-current={selectedHeader === 'trips' ? 'page' : undefined}>
          <FigmaTopIcon section="trips" active={selectedHeader === 'trips'} />
          <span className={styles.navLabel}>Chuyến đi của tôi</span>
        </Link>
        {viewer ? (
          <Link aria-current={creatingTrip ? 'page' : undefined} to={paths.newTrip}>
            <FigmaTopIcon section="schedule" active={creatingTrip} />
            <span className={styles.navLabel}>Tạo chuyến đi</span>
          </Link>
        ) : (
          <Link to={`${paths.login}?returnTo=${encodeURIComponent(paths.newTrip)}`}>
            <FigmaTopIcon section="schedule" />
            <span className={styles.navLabel}>Tạo chuyến đi</span>
          </Link>
        )}
      </nav>
      <div className={styles.account}>
        {viewer ? (
          <>
            <Suspense fallback={<span className={styles.bellPlaceholder} aria-hidden="true" />}>
              <Notifications key={viewer.id ?? 'preview'} actor={viewer.id ?? 'preview'} />
            </Suspense>
            <Suspense
              fallback={
                <Link to={paths.profile} className={styles.profile}>
                  <Avatar name={viewer.fullName} image={viewerAvatarImage} />
                  <span className={styles.accountName}>{viewer.fullName}</span>
                  <span className={styles.profileCompactName}>
                    {`${accountInitials(viewer.fullName)} ${viewer.fullName}`}
                  </span>
                  <span className={styles.profilePurpose}>Hồ sơ cá nhân</span>
                </Link>
              }
            >
              <AccountMenu name={viewer.fullName} image={viewerAvatarImage} />
            </Suspense>
          </>
        ) : guest ? (
          <>
            <Link className={styles.outline} to={paths.login}>
              Đăng nhập
            </Link>
            <Link className={styles.primary} to={paths.register}>
              Bắt đầu miễn phí
            </Link>
          </>
        ) : (
          <span aria-label="Thông tin tài khoản chưa khả dụng">—</span>
        )}
      </div>
    </header>
  );
  // Login and registration share the site header; recovery and admin auth retain their own frame.
  if (currentPath === paths.login || currentPath === paths.register) {
    return (
      <div className={`${styles.authShell} ${styles.authWithHeader}`}>
        <a className={styles.skip} href="#main-content">
          Đến nội dung chính
        </a>
        {desktopHeader}
        <header className={styles.mobileHeader}>
          <Link to={paths.home} className={styles.mobileLogo} aria-label="Wolfari · Trang chủ">
            <BrandWordmark />
          </Link>
          <nav aria-label="Điều hướng tài khoản" className={styles.authMobileNav}>
            <Link to={paths.login} aria-current={currentPath === paths.login ? 'page' : undefined}>
              Đăng nhập
            </Link>
            <Link
              to={paths.register}
              aria-current={currentPath === paths.register ? 'page' : undefined}
            >
              Đăng ký
            </Link>
          </nav>
        </header>
        <main
          ref={contentScope}
          id="main-content"
          tabIndex={-1}
          data-layout="auth"
          data-auth-header
        >
          {children}
        </main>
      </div>
    );
  }
  // Recovery and admin auth retain their standalone frame and route/session guards.
  if (
    [paths.forgotPassword, paths.verifyEmail, paths.resetPassword, '/admin/login'].includes(
      currentPath,
    )
  ) {
    return (
      <div className={styles.authShell}>
        <a className={styles.skip} href="#main-content">
          Đến nội dung chính
        </a>
        <main ref={contentScope} id="main-content" tabIndex={-1} data-layout="auth">
          {children}
        </main>
      </div>
    );
  }
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
        desktopHeader
      )}
      <header
        className={`${styles.mobileHeader} ${adminLayout ? styles.adminMobileHeader : ''}`}
        data-node-id={adminLayout ? undefined : '779:6442'}
      >
        {adminLayout && mobileMenu}
        <Link to={paths.home} className={styles.mobileLogo} aria-label="Wolfari · Trang chủ">
          <BrandWordmark />
        </Link>
        {viewer ? (
          <div className={styles.mobileAccountActions}>
            <Suspense fallback={<span className={styles.bellPlaceholder} aria-hidden="true" />}>
              <Notifications key={viewer.id ?? 'preview'} actor={viewer.id ?? 'preview'} />
            </Suspense>
            <Link
              className={styles.mobileAccount}
              to={paths.profile}
              aria-label={profileLabel(viewer.fullName)}
            >
              <Avatar name={viewer.fullName} image={viewerAvatarImage} />
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
            data-node-id={collapsed ? '937:7692' : '930:6836'}
          >
            <div className={styles.sidebarHead}>
              {!collapsed && <p className={styles.sidebarSection}>Chuyến đi</p>}
              <button
                className={styles.collapseButton}
                aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((value) => !value)}
              >
                {collapsed ? (
                  <>
                    <img src={expandIcon} alt="" />
                    <span className={styles.expandFallbackIcon}>
                      <UiIcon name="chevronRight" size={18} />
                    </span>
                  </>
                ) : (
                  <UiIcon name="chevronLeft" size={20} />
                )}
              </button>
            </div>
            {tripNavigation()}
            {!collapsed && <MascotCard className={styles.mascotCard} />}
          </aside>
        ) : null}
        <main
          ref={contentScope}
          id="main-content"
          tabIndex={-1}
          data-layout={adminLayout ? 'admin' : tripLayout ? 'trip' : listLayout ? 'list' : 'flow'}
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
                  <BrandWordmark />
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
            {adminLayout ? adminNavigation : tripLayout ? tripNavigation(true) : publicNavigation}
            {tripLayout && <MascotCard className={`${styles.mascotCard} ${styles.drawerMascot}`} />}
          </NavigationDrawer>
        </Suspense>
      )}
    </div>
  );
}
