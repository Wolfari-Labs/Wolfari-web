import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { Icon } from '../../shared/components/Icon';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { TripHero } from '../trips/components/TripHero';
import { planScenarios, type PlanScenario } from '../plan/model/plan';
import type {
  PackingFormValues,
  PackingFilter,
  PackingPreviewItem,
  PackingSuggestionCatalog,
} from './packing';
import {
  createPackingSuggestionCatalog,
  emptyPackingForm,
  filterPackingItems,
  groupPackingItems,
  packingDueDate,
  packingFormFromItem,
  packingItemsFromForm,
  packingProgress,
} from './packing';
import { PackingItemDrawer } from './components/PackingItemDrawer';
import styles from './PackingPage.module.css';
import { ActionMenu, ConfirmDialog } from '../../shared/components/Ui';

export function PackingPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const [items, setItems] = useState<PackingPreviewItem[]>([]);
  const [catalog, setCatalog] = useState<PackingSuggestionCatalog>(() =>
    createPackingSuggestionCatalog(),
  );
  const [filter, setFilter] = useState<PackingFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    item: PackingPreviewItem | null;
  }>({ open: false, mode: 'add', item: null });
  const [feedback, setFeedback] = useState('');
  const [deleting, setDeleting] = useState<PackingPreviewItem | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const viewerUserId = data?.trip.currentMembership.userId ?? '';
  const viewerMemberId = data?.trip.currentMembership.id ?? '';
  const canEdit = data?.plan.permissions.canEdit === true;
  const canComplete = data?.plan.permissions.canComplete === true;
  const canWrite = previewEnabled && canEdit && canComplete;

  useEffect(() => {
    if (!data) {
      setItems([]);
      return;
    }
    setItems(data.plan.packingItems.map((item) => ({ ...item, reminder: null })));
    setCatalog(createPackingSuggestionCatalog(data.plan.packingItems));
  }, [data?.plan.tripId, data?.plan.planVersion, viewerUserId, scenario]);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const visible = filterPackingItems(items, filter, category, viewerMemberId);
  const groups = groupPackingItems(visible);
  const progress = packingProgress(items);
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const members = data ? [{ id: viewerMemberId, label: 'Tôi' }] : [];
  const initial: PackingFormValues =
    drawer.item && data ? packingFormFromItem(drawer.item, data.trip.timezone) : emptyPackingForm;

  const closeDrawer = () => {
    setDrawer((current) => ({ ...current, open: false }));
    window.setTimeout(() => addButtonRef.current?.focus(), 0);
  };
  const save = (values: PackingFormValues) => {
    if (!data || !canWrite) return;
    setItems((current) => {
      const next = packingItemsFromForm(
        values,
        drawer.item,
        tripId,
        data.plan.planVersion,
        data.trip.timezone,
      );
      return drawer.item
        ? current.map((item) => (item.id === drawer.item?.id ? next : item))
        : [...current, next];
    });
    setCatalog((current) =>
      createPackingSuggestionCatalog(items, {
        itemNames: [...current.itemNames, values.name],
        categories: [...current.categories, values.category],
      }),
    );
    closeDrawer();
    setFeedback(drawer.item ? 'Đã cập nhật vật dụng' : 'Đã thêm vật dụng vào Packing list');
  };
  const remove = (item: PackingPreviewItem) => {
    if (!canWrite) return;
    setDeleting(item);
  };
  const toggle = (item: PackingPreviewItem) => {
    if (!canWrite) return;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: entry.status === 'COMPLETED' ? 'TODO' : 'COMPLETED',
              completedAt: entry.status === 'COMPLETED' ? null : new Date().toISOString(),
              completedByUserId: entry.status === 'COMPLETED' ? null : viewerUserId,
            }
          : entry,
      ),
    );
  };

  return (
    <>
      <ConfirmDialog
        open={!!deleting}
        title="Xóa vật dụng?"
        description={`Xóa “${deleting?.name ?? ''}” khỏi danh sách trên thiết bị này?`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (canWrite && deleting)
            setItems((current) => current.filter((entry) => entry.id !== deleting.id));
          setDeleting(null);
        }}
      />
      <section
        className={`${styles.page} ${drawer.open ? styles.drawerOpen : ''}`}
        data-flow="packing-read"
        data-mode={previewEnabled ? 'preview' : 'gateway-readonly'}
      >
        <div className={styles.breadcrumb}>
          <Link to={paths.trips}>Chuyến đi của tôi</Link>
          <span aria-hidden="true">›</span>
          {data && (
            <>
              <Link to={paths.trip(tripId)}>{data.trip.name}</Link>
              <span aria-hidden="true">›</span>
            </>
          )}
          <h1>Packing list</h1>
        </div>
        {data && <TripHero trip={data.trip} variant="landscape" />}
        <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
          <section className={styles.summary} aria-label="Tiến độ packing list">
            <div>
              <h2>Packing list</h2>
              <p>
                {progress.completed}/{progress.total} món đã hoàn thành
              </p>
            </div>
            <div className={styles.progress}>
              <i>
                <b style={{ width: `${percent}%` }} />
              </i>
              <span>{percent}%</span>
            </div>
            {canWrite && (
              <Button
                onClick={(event) => {
                  addButtonRef.current = event.currentTarget;
                  setDrawer({ open: true, mode: 'add', item: null });
                }}
              >
                <Icon name="plus" size={18} /> Thêm vật dụng
              </Button>
            )}
          </section>
          <div className={styles.list}>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Bộ lọc vật dụng">
                <button
                  className={filter === 'ALL' ? styles.active : ''}
                  onClick={() => setFilter('ALL')}
                >
                  Tất cả
                </button>
                <button
                  className={filter === 'MINE' ? styles.active : ''}
                  onClick={() => setFilter('MINE')}
                >
                  Của tôi
                </button>
                <button
                  className={filter === 'TODO' ? styles.active : ''}
                  onClick={() => setFilter('TODO')}
                >
                  Chưa hoàn thành
                </button>
              </div>
              <div className={styles.categorySelect}>
                <Select
                  label="Danh mục"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="ALL">Danh mục: Tất cả</option>
                  {catalog.categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className={styles.tableHead}>
              <span aria-hidden="true" />
              <span>Vật dụng</span>
              <span>Số lượng</span>
              <span>Người chuẩn bị</span>
              <span>Hạn chuẩn bị</span>
              <span>Thao tác</span>
            </div>
            {groups.length ? (
              <div className={styles.groups}>
                {groups.map((group) => {
                  const isCollapsed = collapsed.has(group.category);
                  const completed = group.items.filter(
                    (item) => item.status === 'COMPLETED',
                  ).length;
                  return (
                    <section key={group.category} className={styles.group}>
                      <button
                        className={styles.groupHeading}
                        aria-expanded={!isCollapsed}
                        onClick={() =>
                          setCollapsed((current) => {
                            const next = new Set(current);
                            if (isCollapsed) next.delete(group.category);
                            else next.add(group.category);
                            return next;
                          })
                        }
                      >
                        <span>
                          <Icon name="chevron" size={18} /> {group.category}
                        </span>
                        <em>
                          ({completed}/{group.items.length})
                        </em>
                      </button>
                      {!isCollapsed && (
                        <div className={styles.table}>
                          {group.items.map((item) => (
                            <div className={styles.row} key={item.id}>
                              <button
                                className={`${styles.checkbox} ${item.status === 'COMPLETED' ? styles.checked : ''}`}
                                aria-label={`Đánh dấu ${item.name}`}
                                aria-pressed={item.status === 'COMPLETED'}
                                disabled={!canWrite}
                                onClick={() => toggle(item)}
                              >
                                {item.status === 'COMPLETED' ? (
                                  <Icon name="check" size={18} />
                                ) : null}
                              </button>
                              <div className={styles.name}>
                                <strong>{item.name}</strong>
                                {item.note && <small>{item.note}</small>}
                              </div>
                              <span>
                                {item.quantity} {item.unit ?? ''}
                              </span>
                              <span>
                                {item.assignedMemberId === viewerMemberId
                                  ? 'Tôi'
                                  : item.assignedMemberId
                                    ? 'Đã phân công'
                                    : 'Chưa phân công'}
                              </span>
                              <span>
                                {packingDueDate(item.dueAt, data?.trip.timezone ?? 'UTC') ?? '—'}
                              </span>
                              <ActionMenu
                                label={`Thao tác ${item.name}`}
                                items={[
                                  {
                                    label: 'Chỉnh sửa',
                                    disabled: !canWrite,
                                    action: () => setDrawer({ open: true, mode: 'edit', item }),
                                  },
                                  {
                                    label: 'Xóa',
                                    disabled: !canWrite,
                                    danger: true,
                                    action: () => remove(item),
                                  },
                                ]}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                <h2>{items.length ? 'Không có mục phù hợp' : 'Chưa có hành lý đã lưu'}</h2>
                <p>Danh sách phù hợp sẽ xuất hiện tại đây.</p>
              </div>
            )}
          </div>
          {!canWrite && <CapabilityNote>Danh sách hiện chỉ hỗ trợ xem.</CapabilityNote>}
          {feedback && (
            <div className={styles.feedback} role="status">
              {feedback}
            </div>
          )}
        </TripPlanBoundary>
        <PackingItemDrawer
          open={drawer.open}
          mode={drawer.mode}
          initial={initial}
          catalog={catalog}
          members={members}
          onDismiss={closeDrawer}
          onSubmit={save}
        />
        {previewEnabled && (
          <details className="preview">
            <summary>Packing preview · Dữ liệu minh họa</summary>
            <Select
              label="Trạng thái dữ liệu"
              value={scenario}
              onChange={(event) => setScenario(event.target.value as PlanScenario)}
            >
              {planScenarios.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </details>
        )}
      </section>
    </>
  );
}
