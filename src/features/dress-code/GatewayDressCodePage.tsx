import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import type { DressCodeViewModel } from '../plan/model/plan';
import { TripHero } from '../trips/components/TripHero';
import { groupDressCodes } from './dress-code';
import styles from './GatewayDressCodePage.module.css';

type DressFilter = 'ALL' | DressCodeViewModel['scopeType'];
const filters: readonly { value: DressFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'TRIP', label: 'Cả chuyến' },
  { value: 'DAY', label: 'Theo ngày' },
  { value: 'ACTIVITY', label: 'Theo hoạt động' },
];

function scopeLabel(item: DressCodeViewModel) {
  return item.scopeType === 'TRIP'
    ? 'Cả chuyến'
    : item.scopeType === 'DAY'
      ? 'Theo ngày'
      : 'Theo hoạt động';
}

export function GatewayDressCodePage() {
  const { tripId = '' } = useParams();
  const snapshot = useTripPlanSnapshot(tripId, 'success');
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const [filter, setFilter] = useState<DressFilter>('ALL');
  const items = data?.plan.dressCodes;
  const activities = data?.plan.activities;
  const visible = useMemo(
    () => (items ?? []).filter((item) => filter === 'ALL' || item.scopeType === filter),
    [items, filter],
  );
  const groups = useMemo(() => groupDressCodes(visible, activities ?? []), [visible, activities]);

  return (
    <section className={styles.page} data-flow="gateway-dress-read">
      <nav className={styles.breadcrumb} aria-label="Đường dẫn">
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <span>Dress code</span>
      </nav>
      {data && <TripHero trip={data.trip} variant="landscape" />}
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {data && (
          <>
            <h1 className={styles.visuallyHidden}>Dress code</h1>
            {snapshot.refreshFailed && (
              <CapabilityNote tone="warning">
                Chưa tải được dữ liệu mới. Hướng dẫn đang hiển thị bản đã xem trước đó.
                <Button variant="outline" onClick={() => void snapshot.retry()}>
                  Tải lại
                </Button>
              </CapabilityNote>
            )}
            <div className={styles.filters} role="group" aria-label="Lọc phạm vi dress code">
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.content}>
              <section className={styles.cards} aria-label="Hướng dẫn trang phục đã lưu">
                {groups.length ? (
                  groups.map((group) => (
                    <section key={group.key} className={styles.group}>
                      <h2>{group.title}</h2>
                      <div className={styles.cardGrid}>
                        {group.items.map((item) => (
                          <article key={item.id} className={styles.card}>
                            <header className={styles.cardHeader}>
                            <h3>{item.label}</h3>
                              <span>{scopeLabel(item)}</span>
                            </header>
                            <div className={styles.noArtwork} role="note">
                              Chưa có ảnh minh họa riêng cho hướng dẫn này
                            </div>
                            <p>
                              {item.description ??
                                item.publicDescription ??
                                'Chưa có mô tả trang phục.'}
                            </p>
                            <dl>
                              <div>
                                <dt>Phạm vi</dt>
                                <dd>{group.title}</dd>
                              </div>
                              <div>
                                <dt>Nguồn</dt>
                                <dd>
                                  {item.source === 'MANUAL'
                                    ? 'Nhóm đã lưu'
                                    : item.source === 'DSS'
                                      ? 'Gợi ý đã lưu'
                                      : 'Nhà cung cấp'}
                                </dd>
                              </div>
                            </dl>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className={styles.empty} role="status">
                    <h2>
                      {items?.length
                        ? 'Không có hướng dẫn trong phạm vi này'
                        : 'Chưa có hướng dẫn trang phục'}
                    </h2>
                    <p>
                      {items?.length
                        ? 'Chọn phạm vi khác để xem hướng dẫn đã lưu.'
                        : 'Hướng dẫn của nhóm sẽ xuất hiện tại đây khi có dữ liệu.'}
                    </p>
                  </div>
                )}
              </section>
              <aside className={styles.readOnlyPanel} aria-label="Khả năng Dress code">
                <h2>Tạo / Chỉnh sửa bộ phối</h2>
                <p className={styles.badge}>Chỉ xem</p>
                <p>
                  Trang này hiển thị hướng dẫn đã lưu trong kế hoạch. Thêm, sửa, tải ảnh và áp dụng
                  gợi ý chưa khả dụng trong chế độ này.
                </p>
                <p>
                  Ảnh phối đồ và bảng màu trong bản thiết kế là hình minh họa, chưa gắn với từng
                  hướng dẫn đã lưu.
                </p>
              </aside>
            </div>
          </>
        )}
      </TripPlanBoundary>
    </section>
  );
}
