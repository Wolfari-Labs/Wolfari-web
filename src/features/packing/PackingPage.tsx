import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
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
import { PreparationStatus, PackingCompletion } from '../plan/components/PreparationActions';
import { activePlan, canTogglePacking } from '../plan/model/preparation';
import { GatewayPackingEditor } from './components/GatewayPackingEditor';
import { usePackingMembers } from './use-packing-members';
import { RecommendationPanel } from '../plan/components/RecommendationPanel';

export function PackingPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  useEffect(() => {
    if (previewEnabled) return;
    let refreshing = false;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      void snapshot.retry().finally(() => {
        refreshing = false;
      });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [previewEnabled, snapshot.retry]);
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
  const roster = usePackingMembers(data?.trip ?? null, !previewEnabled);
  const canEdit = data?.plan.permissions.canEdit === true;
  const canWrite = previewEnabled && canEdit && !!data && activePlan(data.trip);
  const gatewayItems = useMemo(
    () => data?.plan.packingItems.map((item) => ({ ...item, reminder: null })) ?? [],
    [data?.plan.packingItems],
  );
  const visibleItems = previewEnabled ? items : gatewayItems;
  const categoryOptions = previewEnabled
    ? catalog.categories
    : [...new Set(gatewayItems.map((item) => item.category?.trim() || 'Khác'))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      );

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

  const visible = filterPackingItems(visibleItems, filter, category, viewerMemberId);
  const groups = groupPackingItems(visible);
  const progress = packingProgress(visibleItems);
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
    setFeedback(drawer.item ? 'Đã cập nhật vật dụng' : 'Đã thêm vật dụng vào danh sách đồ đạc');
  };
  const remove = (item: PackingPreviewItem) => {
    if (!canWrite) return;
    setDeleting(item);
  };
  const toggle = (item: PackingPreviewItem) => {
    if (!previewEnabled || !data || !canTogglePacking(data.trip, data.plan, item)) return;
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
        data-mode={
          previewEnabled
            ? 'preview'
            : data?.plan.capabilities?.packing_items_write ||
                data?.plan.capabilities?.packing_completion
              ? 'gateway'
              : 'gateway-readonly'
        }
      >
        <PageBreadcrumb
          className={styles.breadcrumb}
          items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
          current="Đồ đạc"
          mobile={
            <div className={styles.breadcrumb}>
              <Link to={paths.trips}>Chuyến đi của tôi</Link>
              <span aria-hidden="true">›</span>
              {data && (
                <>
                  <Link to={paths.trip(tripId)}>{data.trip.name}</Link>
                  <span aria-hidden="true">›</span>
                </>
              )}
              <h1>Đồ đạc</h1>
            </div>
          }
        />
        {data && <TripHero trip={data.trip} variant="landscape" />}
        <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
          {data && !previewEnabled && (
            <PreparationStatus trip={data.trip} plan={data.plan} refresh={snapshot.retry} />
          )}
          {!previewEnabled && roster.isError && (
            <p role="status">
              Không tải được thông tin thành viên.{' '}
              <Button onClick={() => void roster.refetch()}>Tải lại thành viên</Button>
            </p>
          )}
          <section className={styles.summary} aria-label="Tiến độ đồ đạc">
            <span className={styles.summaryIcon} aria-hidden="true">
              <Icon name="luggage" size={22} />
            </span>
            <div>
              <h2>Đồ đạc</h2>
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
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Bộ lọc vật dụng">
                <button
                  type="button"
                  className={filter === 'ALL' ? styles.active : ''}
                  aria-pressed={filter === 'ALL'}
                  onClick={() => setFilter('ALL')}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={filter === 'MINE' ? styles.active : ''}
                  aria-pressed={filter === 'MINE'}
                  onClick={() => setFilter('MINE')}
                >
                  Của tôi
                </button>
                <button
                  type="button"
                  className={filter === 'TODO' ? styles.active : ''}
                  aria-pressed={filter === 'TODO'}
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
                  {categoryOptions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </div>
            </div>
            {canWrite ? (
              <Button
                onClick={(event) => {
                  addButtonRef.current = event.currentTarget;
                  setDrawer({ open: true, mode: 'add', item: null });
                }}
              >
                <Icon name="plus" size={18} /> Thêm vật dụng
              </Button>
            ) : !previewEnabled && data?.plan.capabilities?.packing_items_write ? (
              <GatewayPackingEditor
                key={`${tripId}:${viewerUserId}:create`}
                addButtonRef={addButtonRef}
                trip={data.trip}
                plan={data.plan}
                refresh={snapshot.retry}
              />
            ) : !previewEnabled ? (
              <span className={styles.readOnlyBadge}>Chỉ xem</span>
            ) : null}
          </section>
          <div className={styles.list}>
            <div className={styles.tableHead}>
              <span aria-hidden="true" />
              <span>Vật dụng</span>
              <span>Số lượng</span>
              <span>Người chuẩn bị</span>
              <span>Hạn chuẩn bị</span>
              <span>
                {previewEnabled || data?.plan.capabilities?.packing_items_write
                  ? 'Thao tác'
                  : 'Quyền'}
              </span>
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
                            <div
                              className={
                                previewEnabled ? styles.row : `${styles.row} ${styles.gatewayRow}`
                              }
                              key={item.id}
                            >
                              {previewEnabled ? (
                                <button
                                  className={`${styles.checkbox} ${item.status === 'COMPLETED' ? styles.checked : ''}`}
                                  aria-label={`Đánh dấu ${item.name}`}
                                  aria-pressed={item.status === 'COMPLETED'}
                                  disabled={!data || !canTogglePacking(data.trip, data.plan, item)}
                                  onClick={() => toggle(item)}
                                >
                                  {item.status === 'COMPLETED' ? (
                                    <Icon name="check" size={18} />
                                  ) : null}
                                </button>
                              ) : data && data.plan.capabilities?.packing_completion ? (
                                <PackingCompletion
                                  item={item}
                                  trip={data.trip}
                                  plan={data.plan}
                                  refresh={snapshot.retry}
                                  checkboxClassName={`${styles.checkbox} ${item.status === 'COMPLETED' ? styles.checked : ''}`}
                                />
                              ) : (
                                <span
                                  className={`${styles.checkbox} ${item.status === 'COMPLETED' ? styles.checked : ''}`}
                                  role="img"
                                  aria-label={
                                    item.status === 'COMPLETED'
                                      ? 'Đã hoàn thành'
                                      : 'Chưa hoàn thành'
                                  }
                                >
                                  {item.status === 'COMPLETED' && <Icon name="check" size={18} />}
                                </span>
                              )}
                              <div className={styles.name}>
                                <strong>{item.name}</strong>
                                {item.note && <small>{item.note}</small>}
                                {!previewEnabled && item.completedAt && (
                                  <small>
                                    Hoàn thành:{' '}
                                    {new Intl.DateTimeFormat('vi-VN', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                      timeZone: data?.trip.timezone ?? 'UTC',
                                    }).format(new Date(item.completedAt))}{' '}
                                    ·{' '}
                                    {item.completedByUserId === viewerUserId
                                      ? 'Tôi'
                                      : (roster.data?.find(
                                          (m) => m.userId === item.completedByUserId,
                                        )?.presentation.displayName ?? 'Thành viên')}
                                  </small>
                                )}
                              </div>
                              <span className={styles.quantity}>
                                {!previewEnabled && (
                                  <span className={styles.mobileReadLabel}>Số lượng: </span>
                                )}
                                {item.quantity} {item.unit ?? ''}
                              </span>
                              <span className={styles.assignee}>
                                {!previewEnabled && (
                                  <span className={styles.mobileReadLabel}>Người chuẩn bị: </span>
                                )}
                                {item.assignedMemberId === viewerMemberId
                                  ? 'Tôi'
                                  : item.assignedMemberId
                                    ? previewEnabled
                                      ? 'Đã phân công'
                                      : (roster.data?.find((m) => m.id === item.assignedMemberId)
                                          ?.presentation.displayName ??
                                        (roster.isPending
                                          ? 'Đang tải thành viên…'
                                          : 'Không tải được thông tin thành viên'))
                                    : 'Chưa phân công'}
                              </span>
                              <span className={styles.due}>
                                {!previewEnabled && (
                                  <span className={styles.mobileReadLabel}>Hạn chuẩn bị: </span>
                                )}
                                {packingDueDate(item.dueAt, data?.trip.timezone ?? 'UTC') ? (
                                  <>
                                    <Icon
                                      name="calendar"
                                      size={14}
                                      className={styles.dueIcon ?? ''}
                                    />
                                    {packingDueDate(item.dueAt, data?.trip.timezone ?? 'UTC')}
                                  </>
                                ) : (
                                  '—'
                                )}
                              </span>
                              {previewEnabled ? (
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
                              ) : data?.plan.capabilities?.packing_items_write ||
                                data?.plan.capabilities?.packing_assignment ||
                                data?.plan.capabilities?.packing_completion ? (
                                <div className={styles.gatewayActions}>
                                  {data && (
                                    <>
                                      <GatewayPackingEditor
                                        key={`${tripId}:${viewerUserId}:${item.id}`}
                                        addButtonRef={addButtonRef}
                                        item={item}
                                        trip={data.trip}
                                        plan={data.plan}
                                        refresh={snapshot.retry}
                                      />
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className={styles.readOnlyRowLabel}>Chỉ xem</span>
                              )}
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
                <h2>{visibleItems.length ? 'Không có mục phù hợp' : 'Chưa có hành lý đã lưu'}</h2>
                <p>Danh sách phù hợp sẽ xuất hiện tại đây.</p>
              </div>
            )}
          </div>
          {!canWrite &&
            !data?.plan.capabilities?.packing_items_write &&
            !data?.plan.capabilities?.packing_completion && (
              <CapabilityNote>
                {previewEnabled
                  ? 'Danh sách hiện chỉ hỗ trợ xem.'
                  : 'Danh sách hiện chỉ hỗ trợ xem. Trạng thái hoàn thành, thêm và sửa vật dụng chưa khả dụng trong chế độ này.'}
              </CapabilityNote>
            )}
          {feedback && (
            <div className={styles.feedback} role="status">
              {feedback}
            </div>
          )}
          {data && !previewEnabled && (
            <RecommendationPanel
              type="PACKING_DRESS"
              trip={data.trip}
              plan={data.plan}
              refresh={snapshot.retry}
            />
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
