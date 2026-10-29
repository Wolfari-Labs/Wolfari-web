import { Link, useParams } from 'react-router';
import { useTripPlanSnapshot } from '../hooks/use-trip-plan-snapshot';
import { TripPlanBoundary } from './TripPlanBoundary';
import { TripHero } from '../../trips/components/TripHero';
import { Icon } from '../../../shared/components/Icon';
import { Badge } from '../../../shared/components/Ui';
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
              Chế độ xem:{' '}
              {kind === 'map'
                ? 'địa điểm đã lưu trong chuyến đi; bản đồ tương tác chưa được kết nối.'
                : 'hướng dẫn trang phục đã lưu cho nhóm.'}{' '}
              Chức năng thêm và chỉnh sửa chưa khả dụng.
            </Alert>
            <section className={styles.panel}>
              {kind === 'map' ? (
                <>
                  <h2>{data.plan.selectedLocations.length} địa điểm đã lưu</h2>
                  <ul className={styles.readGrid}>
                    {data.plan.selectedLocations.map((p) => (
                      <li key={p.id} className={styles.readCard}>
                        <Icon name="map" size={28} />
                        <h3>{p.name}</h3>
                        <p>{p.address ?? 'Chưa có địa chỉ'}</p>
                        <p>
                          {p.latitude !== null && p.longitude !== null
                            ? `Tọa độ: ${p.latitude}, ${p.longitude}`
                            : 'Chưa có tọa độ'}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {!data.plan.selectedLocations.length && (
                    <div className={styles.empty}>
                      <Icon name="map" size={40} />
                      <h3>Chuyến đi chưa có địa điểm</h3>
                      <p>Các địa điểm của nhóm sẽ xuất hiện tại đây khi được thêm vào chuyến đi.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2>{data.plan.dressCodes.length} hướng dẫn đã lưu</h2>
                  <ul className={styles.readGrid}>
                    {data.plan.dressCodes.map((d) => (
                      <li key={d.id} className={styles.readCard}>
                        <Icon name="dress" size={28} />
                        <Badge>
                          {d.scopeType === 'TRIP'
                            ? 'Cả chuyến'
                            : d.scopeType === 'DAY'
                              ? 'Theo ngày'
                              : 'Theo hoạt động'}
                        </Badge>
                        <h3>{d.label}</h3>
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
                  {!data.plan.dressCodes.length && (
                    <div className={styles.empty}>
                      <Icon name="dress" size={40} />
                      <h3>Chưa có hướng dẫn trang phục</h3>
                      <p>Hướng dẫn của nhóm sẽ xuất hiện tại đây khi có dữ liệu.</p>
                    </div>
                  )}
                </>
              )}
              <p className={styles.metadata}>
                <Badge>Chỉ xem</Badge>
              </p>
            </section>
          </>
        )}
      </TripPlanBoundary>
    </section>
  );
}
