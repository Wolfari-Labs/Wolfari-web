import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { planScenarios, type PlanScenario } from '../plan/model/plan';
import { Select } from '../../shared/components/Select';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { groupDressCodes } from './dress-code';
import styles from './DressCodePage.module.css';

export function DressCodePage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [scope, setScope] = useState<'ALL' | 'TRIP' | 'DAY' | 'ACTIVITY'>('ALL');
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const items = data ? data.plan.dressCodes.filter((item) => scope === 'ALL' || item.scopeType === scope) : [];
  const groups = data ? groupDressCodes(items, data.plan.activities) : [];
  return (
    <section className={styles.page} data-flow="dress-code-read">
      <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link><span>›</span><h1>Dress Code</h1></div>
      <header className={styles.hero}><div><p>Chuẩn bị trang phục</p><h2>Dress Code</h2><span>Các hướng dẫn đã lưu theo chuyến đi, ngày và hoạt động.</span></div><Select label="Phạm vi" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="ALL">Tất cả</option><option value="TRIP">Chuyến đi</option><option value="DAY">Theo ngày</option><option value="ACTIVITY">Hoạt động</option></Select></header>
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {groups.length ? <div className={styles.groups}>{groups.map((group) => <section key={group.key} className={styles.group}><h3>{group.title}</h3><div className={styles.cards}>{group.items.map((item) => <article key={item.id}><span className={styles.scope}>{item.scopeType === 'TRIP' ? 'Chuyến đi' : item.scopeType === 'DAY' ? 'Theo ngày' : 'Hoạt động'}</span><h4>{item.label}</h4><p>{item.description ?? item.publicDescription ?? 'Chưa có mô tả.'}</p><small>Nguồn: {item.source === 'DSS' ? 'Gợi ý đã lưu trước đây' : item.source === 'PROVIDER' ? 'Nhà cung cấp' : 'Thủ công'}</small></article>)}</div></section>)}</div> : <div className={styles.empty} role="status"><h2>Chưa có dress code đã lưu</h2><p>Các hướng dẫn đã lưu sẽ xuất hiện tại đây.</p></div>}
        <CapabilityNote>Gợi ý trang phục, hình ảnh, bảng màu và chỉnh sửa chưa khả dụng. Nguồn DSS chỉ mô tả lịch sử của dữ liệu đã lưu, không phải AI đang hoạt động.</CapabilityNote>
      </TripPlanBoundary>
      {previewEnabled && <details className="preview"><summary>Dress Code preview · Dữ liệu minh họa</summary><Select label="Trạng thái dữ liệu" value={scenario} onChange={(event) => setScenario(event.target.value as PlanScenario)}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
    </section>
  );
}
