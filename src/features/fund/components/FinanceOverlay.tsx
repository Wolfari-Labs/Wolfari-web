import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Drawer } from '../../../shared/components/Drawer';
import { Icon, type IconName } from '../../../shared/components/Icon';
import styles from './FinanceOverlay.module.css';

export type FinanceSection =
  | 'general'
  | 'members'
  | 'contributions'
  | 'expenses'
  | 'refunds'
  | 'receiving'
  | 'handover'
  | 'closure';

const sections: readonly { id: FinanceSection; label: string; icon: IconName }[] = [
  { id: 'general', label: 'Thông tin chung', icon: 'settings' },
  { id: 'members', label: 'Thành viên & quyền', icon: 'members' },
  { id: 'contributions', label: 'Đợt đóng góp', icon: 'fund' },
  { id: 'expenses', label: 'Khoản chi', icon: 'down' },
  { id: 'refunds', label: 'Hoàn tiền', icon: 'refresh' },
  { id: 'receiving', label: 'Thông tin nhận tiền', icon: 'fund' },
  { id: 'handover', label: 'Bàn giao Fund Holder', icon: 'members' },
  { id: 'closure', label: 'Đóng Finance', icon: 'close' },
];

const sectionMeta: Record<
  FinanceSection,
  { eyebrow: string; heading: string; description: string }
> = {
  general: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / THÔNG TIN CHUNG',
    heading: 'Thông tin chung',
    description: 'Xem trạng thái và cập nhật ngân sách quỹ của chuyến đi.',
  },
  members: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / THÀNH VIÊN & QUYỀN',
    heading: 'Thành viên & quyền',
    description: 'Xem vai trò Owner, Fund Holder và quyền thao tác theo SRS.',
  },
  contributions: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / ĐỢT ĐÓNG GÓP',
    heading: 'Đợt đóng góp',
    description: 'Theo dõi các khoản đóng góp và trạng thái đối soát.',
  },
  expenses: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / KHOẢN CHI',
    heading: 'Khoản chi',
    description: 'Theo dõi đề nghị chi và xác nhận của người giữ quỹ.',
  },
  refunds: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / HOÀN TIỀN',
    heading: 'Hoàn tiền',
    description: 'Theo dõi các khoản hoàn tiền và xác nhận của người nhận.',
  },
  receiving: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / THÔNG TIN NHẬN TIỀN',
    heading: 'Thông tin nhận tiền',
    description: 'Quản lý đích nhận và xác nhận trách nhiệm của Fund Holder.',
  },
  handover: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / BÀN GIAO FUND HOLDER',
    heading: 'Bàn giao Fund Holder',
    description: 'Khu vực bàn giao sẽ hiển thị khi Gateway có contract tương ứng.',
  },
  closure: {
    eyebrow: 'QUỸ NHÓM / CÀI ĐẶT / ĐÓNG FINANCE',
    heading: 'Đóng Finance',
    description: 'Kiểm tra điều kiện đóng quỹ trước khi Finance chuyển trạng thái.',
  },
};

export function FinanceOverlay({
  open,
  onDismiss,
  section,
  onSectionChange,
  tripName,
  status,
  role,
  children,
  context,
  heading,
  description,
  returnFocusRef,
  toolbar,
  unframed = false,
}: {
  open: boolean;
  onDismiss: () => void;
  section: FinanceSection;
  onSectionChange: (section: FinanceSection) => void;
  tripName: string;
  status: string;
  role: string;
  children: ReactNode;
  context?: ReactNode;
  heading?: string;
  description?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  toolbar?: ReactNode;
  unframed?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const meta = sectionMeta[section];

  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open, section]);

  return (
    <Drawer
      open={open}
      label="Cài đặt quỹ nhóm"
      onDismiss={onDismiss}
      side="center"
      className={styles.financeDrawer ?? ''}
      overlayClassName={styles.financeBackdrop ?? ''}
      showHeader={false}
      initialFocusRef={headingRef}
      {...(returnFocusRef ? { returnFocusRef } : {})}
    >
      <div className={styles.frame} data-finance-overlay="true">
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <Icon name="settings" size={30} />
          </div>
          <div className={styles.headerCopy}>
            <strong>Cài đặt quỹ nhóm</strong>
            <span>Quản lý trách nhiệm quỹ · {tripName} · Dữ liệu TEST</span>
          </div>
          <button
            className={styles.close}
            type="button"
            onClick={onDismiss}
            aria-label="Đóng cài đặt quỹ"
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className={styles.body}>
          <aside className={styles.sidebar} aria-label="Các phần cài đặt quỹ">
            <div className={styles.tripSummary}>
              <Icon name="plan" size={22} />
              <div>
                <strong>{tripName}</strong>
                <span>Finance {status} · VND</span>
              </div>
            </div>
            <nav className={styles.nav}>
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={section === item.id ? 'page' : undefined}
                  data-active={section === item.id ? 'true' : 'false'}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <p className={styles.permissionNote}>
              Theo SRS: quyền thao tác được kiểm tra theo Owner, Member và Fund Holder.
            </p>
          </aside>
          <main className={styles.main}>
            <div className={styles.mainIntro}>
              <span>{meta.eyebrow}</span>
              <div className={styles.titleLine}>
                <h2 ref={headingRef} tabIndex={-1}>
                  {heading ?? meta.heading}
                </h2>
                <div className={styles.introActions}>
                  {toolbar}
                  <span className={styles.role}>{role}</span>
                </div>
              </div>
              <p>{description ?? meta.description}</p>
            </div>
            <div className={`${styles.contentGrid} ${context ? styles.withContext : ''}`}>
              <section
                className={`${styles.content} ${unframed ? styles.unframed : ''}`}
                aria-label={heading ?? meta.heading}
              >
                {children}
              </section>
              {context && (
                <aside className={styles.context} aria-label="Tình trạng và mục tiêu">
                  {context}
                </aside>
              )}
            </div>
          </main>
        </div>
        <footer className={styles.footer}>
          <span aria-hidden="true">ⓘ</span>
          Wolfari quản lý sổ quỹ nhóm, không trực tiếp nhận hoặc chuyển tiền.
        </footer>
      </div>
    </Drawer>
  );
}
