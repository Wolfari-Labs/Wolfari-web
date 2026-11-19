import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useDesktopLayout } from '../lib/use-desktop-layout';
import workspace from '../styles/WorkspacePage.module.css';

export interface BreadcrumbItem {
  label: string;
  to: string;
}

/**
 * The one page header of the trip workspace: "Parent › Current" with the current page as the
 * always-visible `h1` (UI declutter plan C2, D8). Pages pass their own `className` (which composes
 * the shared `breadcrumb` class) so the deferred mobile rules keep matching.
 *
 * `mobile` is the page's previous header, rendered instead below the desktop breakpoint because the
 * mobile layout is deferred (plan section 2.1). It must contain its own heading when it replaces the
 * `h1` — exactly one `h1` is ever rendered.
 */
export function PageBreadcrumb({
  items,
  current,
  className,
  mobile,
  trailing,
}: {
  items: readonly BreadcrumbItem[];
  current: string;
  className?: string | undefined;
  mobile?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
}) {
  const desktop = useDesktopLayout();
  if (!desktop && mobile !== undefined) return <>{mobile}</>;
  return (
    <nav className={className ?? workspace.breadcrumb} aria-label="Đường dẫn">
      {items.map((item) => (
        <Fragment key={item.to}>
          <Link to={item.to}>{item.label}</Link>
          <span aria-hidden="true">›</span>
        </Fragment>
      ))}
      <h1 aria-current="page">{current}</h1>
      {trailing && <span className={workspace.breadcrumbTrailing}>{trailing}</span>}
    </nav>
  );
}
