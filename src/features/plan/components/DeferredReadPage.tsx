import { Link, useParams } from 'react-router';
import { useTripPlanSnapshot } from '../hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from './TripPlanBoundary';
import { TripHero } from '../../trips/components/TripHero';
import { Button } from '../../../shared/components/Button';
import { Alert } from '../../../shared/components/Alert';
import { paths } from '../../../app/route-paths';
import styles from '../../../shared/styles/DemoWorkspace.module.css';
/** No local draft/provider data in the Gateway read-only views. */
export function DeferredReadPage({ kind }: { kind: 'map' | 'dress' }) {
  const { tripId = '' } = useParams(),
    snapshot = useTripPlanSnapshot(tripId, 'success');
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  return (
    <section className={styles.page}>
      <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
      <h1>{kind === 'map' ? 'Bản đồ & địa điểm' : 'Dress Code'}</h1>
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {data && (
          <>
            <TripHero trip={data.trip} compact variant="landscape" />
            <Alert>
              Demo1 chỉ đọc dữ liệu đã lưu trên server. Writer{' '}
              {kind === 'map'
                ? 'địa điểm, Google Places và bản đồ tương tác'
                : 'Dress Code và gợi ý DSS'}{' '}
              ở giai đoạn sau. Bản nháp local cũ không đồng bộ và không được ghép vào dữ liệu này.
            </Alert>
            <section className={styles.panel}>
              {kind === 'map' ? (
                <>
                  <h2>{data.plan.selectedLocations.length} địa điểm đã lưu</h2>
                  <ul className={styles.list}>
                    {data.plan.selectedLocations.map((p) => (
                      <li key={p.id}>
                        <strong>{p.name}</strong>
                        <p>{p.address ?? 'Chưa có địa chỉ'}</p>
                        <p>
                          {p.latitude && p.longitude
                            ? `Tọa độ: ${p.latitude}, ${p.longitude}`
                            : 'Chưa có tọa độ'}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {!data.plan.selectedLocations.length && (
                    <p>Chưa có địa điểm được lưu trên server.</p>
                  )}
                </>
              ) : (
                <>
                  <h2>{data.plan.dressCodes.length} hướng dẫn đã lưu</h2>
                  <ul className={styles.list}>
                    {data.plan.dressCodes.map((d) => (
                      <li key={d.id}>
                        <strong>{d.label}</strong>
                        <p>{d.description ?? d.publicDescription ?? 'Chưa có mô tả'}</p>
                        <p>
                          {d.scopeType === 'DAY'
                            ? d.planDate
                            : d.scopeType === 'TRIP'
                              ? 'Cả chuyến'
                              : (data.plan.activities.find((a) => a.id === d.activityId)?.title ??
                                'Hoạt động chưa xác định')}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {!data.plan.dressCodes.length && <p>Chưa có Dress Code trên server.</p>}
                </>
              )}
              <Button variant="outline" disabled title="Chưa có writer trong demo1">
                Thêm / sửa — sau demo1
              </Button>
            </section>
          </>
        )}
      </TripPlanBoundary>
    </section>
  );
}
