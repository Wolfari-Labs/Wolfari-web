import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { planScenarios, type PlanScenario } from '../plan/model/plan';
import { Select } from '../../shared/components/Select';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { groupPackingItems, packingDueDate, packingProgress } from './packing';
import styles from './PackingPage.module.css';

export function PackingPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [status, setStatus] = useState<'ALL' | 'TODO' | 'COMPLETED'>('ALL');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const allItems = data?.plan.packingItems ?? [];
  const progress = packingProgress(allItems);
  const groups = groupPackingItems(allItems.filter((item) => status === 'ALL' || item.status === status));
  const percent = progress.total ? Math.round(progress.completed / progress.total * 100) : 0;
  return (
    <section className={styles.page} data-flow="packing-read">
      <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link><span>›</span><h1>Packing List</h1></div>
      <header className={styles.hero}><div><p>Hành lý</p><h2>Chuẩn bị thật gọn nhẹ</h2><span>Theo dõi danh sách đã được lưu trong kế hoạch chuyến đi.</span></div>{data && <div className={styles.progress} aria-label={`${progress.completed} trên ${progress.total} mục đã hoàn thành`}><strong>{progress.completed}/{progress.total}</strong><span>Đã chuẩn bị · {percent}%</span><i><b style={{ width: `${percent}%` }} /></i></div>}</header>
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        <div className={styles.toolbar}><Select label="Trạng thái" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="ALL">Tất cả</option><option value="TODO">Chưa hoàn tất</option><option value="COMPLETED">Đã hoàn tất</option></Select></div>
        {groups.length ? <div className={styles.groups}>{groups.map((group) => <section key={group.category} className={styles.group}><h3>{group.category}<span>{group.items.length}</span></h3><ul>{group.items.map((item) => <li key={item.id}><span className={`${styles.statusIcon} ${item.status === 'COMPLETED' ? styles.done : ''}`} aria-hidden="true">{item.status === 'COMPLETED' ? '✓' : '○'}</span><div className={styles.itemCopy}><strong>{item.name}</strong><p>{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.note ? ` · ${item.note}` : ''}</p><small>{item.assignedMemberId ? 'Đã phân công' : 'Chưa phân công'}{packingDueDate(item.dueAt, data!.trip.timezone) ? ` · Hạn ${packingDueDate(item.dueAt, data!.trip.timezone)}` : ''}</small></div><span className={styles.statusText}>{item.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chưa hoàn tất'}</span></li>)}</ul></section>)}</div> : <div className={styles.empty} role="status"><h2>{allItems.length ? 'Không có mục phù hợp' : 'Chưa có hành lý đã lưu'}</h2><p>Danh sách hành lý phù hợp sẽ xuất hiện tại đây.</p></div>}
        <CapabilityNote>Danh sách này chỉ đọc. Thêm, sửa, xóa, phân công và đánh dấu hoàn tất chưa có write contract và không dùng thao tác hoàn tất Activity.</CapabilityNote>
      </TripPlanBoundary>
      {previewEnabled && <details className="preview"><summary>Packing preview · Dữ liệu minh họa</summary><Select label="Trạng thái dữ liệu" value={scenario} onChange={(event) => setScenario(event.target.value as PlanScenario)}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
    </section>
  );
}
