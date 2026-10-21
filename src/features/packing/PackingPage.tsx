import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { planScenarios, type PlanScenario } from '../plan/model/plan';
import type { PackingFormValues, PackingFilter, PackingPreviewItem } from './packing';
import { emptyPackingForm, filterPackingItems, groupPackingItems, packingDueDate, packingFormFromItem, packingItemsFromForm, packingProgress } from './packing';
import { PackingItemDrawer } from './components/PackingItemDrawer';
import styles from './PackingPage.module.css';

export function PackingPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const [items, setItems] = useState<PackingPreviewItem[]>([]);
  const [filter, setFilter] = useState<PackingFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'add' | 'edit'; item: PackingPreviewItem | null }>({ open: false, mode: 'add', item: null });
  const [feedback, setFeedback] = useState('');
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const viewerId = data?.trip.currentMembership.userId ?? '';
  const canEdit = data?.plan.permissions.canEdit === true;
  const canComplete = data?.plan.permissions.canComplete === true;
  useEffect(() => { if (data) setItems(data.plan.packingItems.map((item) => ({ ...item, reminder: null }))); }, [data?.plan.tripId, data?.plan.planVersion, scenario]);
  useEffect(() => { if (!feedback) return; const timer = window.setTimeout(() => setFeedback(''), 3000); return () => window.clearTimeout(timer); }, [feedback]);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category?.trim() || 'Khác'))].sort((a, b) => a.localeCompare(b, 'vi')), [items]);
  const visible = filterPackingItems(items, filter, category, viewerId);
  const groups = groupPackingItems(visible);
  const progress = packingProgress(items);
  const percent = progress.total ? Math.round(progress.completed / progress.total * 100) : 0;
  const members = data ? [{ id: viewerId, label: 'Tôi' }] : [];
  const initial: PackingFormValues = drawer.item && data ? packingFormFromItem(drawer.item, data.trip.timezone) : emptyPackingForm;
  const closeDrawer = () => { setDrawer((current) => ({ ...current, open: false })); window.setTimeout(() => addButtonRef.current?.focus(), 0); };
  const save = (values: PackingFormValues) => { if (!data) return; setItems((current) => { const next = packingItemsFromForm(values, drawer.item, tripId, data.plan.planVersion, data.trip.timezone); return drawer.item ? current.map((item) => item.id === drawer.item?.id ? next : item) : [...current, next]; }); closeDrawer(); setFeedback('Đã lưu vật dụng · Bản xem trước chỉ lưu trong phiên này.'); };
  const remove = (item: PackingPreviewItem) => { if (window.confirm(`Xóa vật dụng “${item.name}”?`)) setItems((current) => current.filter((entry) => entry.id !== item.id)); };
  const toggle = (item: PackingPreviewItem) => { if (!canComplete) return; setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === 'COMPLETED' ? 'TODO' : 'COMPLETED', completedAt: entry.status === 'COMPLETED' ? null : new Date().toISOString(), completedByUserId: entry.status === 'COMPLETED' ? null : viewerId } : entry)); };
  return <section className={styles.page} data-flow="packing-preview">
    <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link><span aria-hidden="true">›</span><h1>Packing List</h1></div>
    <header className={styles.hero}><div><p>HÀNH LÝ</p><h2>Chuẩn bị thật gọn nhẹ</h2><span>Danh sách trong kế hoạch chuyến đi · bản xem trước.</span></div><div className={styles.progress}><strong>{progress.completed}/{progress.total}</strong><span>Đã chuẩn bị · {percent}%</span><i><b style={{ width: `${percent}%` }} /></i></div></header>
    <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
      <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Bộ lọc vật dụng"><button className={filter === 'ALL' ? styles.active : ''} onClick={() => setFilter('ALL')}>Tất cả</button><button className={filter === 'MINE' ? styles.active : ''} onClick={() => setFilter('MINE')}>Của tôi</button><button className={filter === 'TODO' ? styles.active : ''} onClick={() => setFilter('TODO')}>Chưa hoàn thành</button></div><Select label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">Tất cả danh mục</option>{categories.map((value) => <option key={value}>{value}</option>)}</Select>{canEdit && <Button onClick={(event) => { addButtonRef.current = event.currentTarget; setDrawer({ open: true, mode: 'add', item: null }); }}>+ Thêm vật dụng</Button>}</div>
      {!canEdit && <CapabilityNote>Bạn đang ở chế độ chỉ đọc. Các thao tác thay đổi danh sách đã được khóa.</CapabilityNote>}
      {items.some((item) => item.assignedMemberId) && <span className={styles.assignedHint}>Đã phân công</span>}
      {feedback && <div className={styles.feedback} role="status">{feedback}</div>}
      {groups.length ? <div className={styles.groups}>{groups.map((group) => { const isCollapsed = collapsed.has(group.category); return <section key={group.category} className={styles.group}><button className={styles.groupHeading} aria-expanded={!isCollapsed} onClick={() => setCollapsed((current) => { const next = new Set(current); if (isCollapsed) next.delete(group.category); else next.add(group.category); return next; })}><span>{isCollapsed ? '▸' : '▾'} {group.category}</span><em>{group.items.length}</em></button>{!isCollapsed && <div className={styles.table}><div className={styles.tableHead}><span>Vật dụng</span><span>Số lượng</span><span>Người chuẩn bị</span><span>Hạn chuẩn bị</span><span /></div>{group.items.map((item) => <div className={styles.row} key={item.id}><button className={`${styles.checkbox} ${item.status === 'COMPLETED' ? styles.checked : ''}`} aria-label={`Đánh dấu ${item.name}`} aria-pressed={item.status === 'COMPLETED'} disabled={!canComplete} onClick={() => toggle(item)}>{item.status === 'COMPLETED' ? '✓' : ''}</button><div className={styles.name}><strong>{item.name}</strong>{item.note && <small>{item.note}</small>}</div><span>{item.quantity} {item.unit ?? ''}</span><span>{item.assignedMemberId === viewerId ? 'Tôi' : item.assignedMemberId ? 'Thành viên' : 'Chưa phân công'}</span><span>{packingDueDate(item.dueAt, data?.trip.timezone ?? 'UTC') ?? '—'}</span><details className={styles.menu}><summary aria-label={`Thao tác ${item.name}`}>•••</summary><div><button disabled={!canEdit} onClick={() => setDrawer({ open: true, mode: 'edit', item })}>Chỉnh sửa</button><button disabled={!canEdit} onClick={() => remove(item)}>Xóa</button></div></details></div>)}</div>}</section>; })}</div> : <div className={styles.empty}><h2>{items.length ? 'Không có mục phù hợp' : 'Chưa có hành lý đã lưu'}</h2><p>Danh sách phù hợp sẽ xuất hiện tại đây.</p></div>}
    </TripPlanBoundary>
    <PackingItemDrawer open={drawer.open} mode={drawer.mode} initial={initial} categories={categories} members={members} onDismiss={closeDrawer} onSubmit={save} />
    {previewEnabled && <details className="preview"><summary>Packing preview · Dữ liệu minh họa</summary><Select label="Trạng thái dữ liệu" value={scenario} onChange={(event) => setScenario(event.target.value as PlanScenario)}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
  </section>;
}
