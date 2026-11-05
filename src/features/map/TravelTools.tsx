import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../app/gateway-context';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Card } from '../../shared/components/Ui';
import { PreparationActions, type PreparationProps } from '../plan/components/PreparationActions';
import type { ProviderMetadata, RouteResult } from '../plan/model/travel';
import { validCoordinates } from './trip-map';
import styles from '../plan/components/PreparationActions.module.css';

export function ProviderSource({ meta, timezone }: { meta: ProviderMetadata; timezone: string }) {
  return (
    <p>
      Nguồn: {meta.provider} ·{' '}
      {meta.fetchedAt
        ? new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: timezone,
            hourCycle: 'h23',
          }).format(new Date(meta.fetchedAt))
        : 'Chưa rõ thời điểm'}
      {meta.stale ? ' · Dữ liệu cũ' : ''}
      {meta.isMock ? ' · Dữ liệu mô phỏng, không dùng như kết quả thật' : ''}
      {meta.warnings.length ? ` · ${meta.warnings.join('; ')}` : ''}
    </p>
  );
}
export function TravelTools({
  onRoute,
  ...props
}: PreparationProps & { onRoute: (route: RouteResult | null) => void }) {
  const service = useRuntimeServices()?.travel;
  const [text, setText] = useState('');
  const [search, setSearch] = useState<{ query: string; nonce: number } | null>(null);
  const [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [mode, setMode] = useState<'WALKING' | 'DRIVING' | 'CYCLING'>('WALKING');
  const [request, setRequest] = useState<{
    from: string;
    to: string;
    mode: typeof mode;
    version: number;
    nonce: number;
  } | null>(null);
  const locations = props.plan.selectedLocations.filter((v) => validCoordinates(v));
  const searchResult = useQuery({
    queryKey: ['travel', 'places', props.trip.id, props.trip.currentMembership.userId, search],
    enabled: !!service && !!search && !!props.plan.capabilities?.place_search,
    retry: false,
    queryFn: ({ signal }) => service!.search(props.trip.id, search!.query, signal),
  });
  const routeResult = useQuery({
    queryKey: ['travel', 'route', props.trip.id, props.trip.currentMembership.userId, request],
    enabled:
      !!service &&
      !!request &&
      request.version === props.plan.planVersion &&
      !!props.plan.capabilities?.routes,
    retry: false,
    queryFn: ({ signal }) => {
      const start = locations.find((v) => v.id === request!.from),
        end = locations.find((v) => v.id === request!.to);
      if (!start || !end) throw Error('Địa điểm không còn hợp lệ');
      return service!.route(
        props.trip.id,
        [validCoordinates(start)!, validCoordinates(end)!],
        request!.mode,
        signal,
      );
    },
  });
  const route =
    request?.version === props.plan.planVersion && props.plan.capabilities?.routes
      ? routeResult.data
      : null;
  useEffect(() => {
    onRoute(route?.data ?? null);
    return () => onRoute(null);
  }, [route, onRoute]);
  if (!props.plan.capabilities?.place_search && !props.plan.capabilities?.routes) return null;
  return (
    <Card className={styles.form} aria-label="Tìm địa điểm và tuyến đường">
      {!service && <p role="status">Dịch vụ Travel chưa khả dụng trong phiên này.</p>}
      {props.plan.capabilities?.place_search && (
        <section className={styles.form}>
          <h2>Tìm địa điểm từ nhà cung cấp</h2>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) setSearch({ query: text.trim(), nonce: Date.now() });
            }}
          >
            <Input
              label="Từ khóa địa điểm"
              type="search"
              required
              maxLength={255}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" disabled={!service || searchResult.isFetching}>
              Tìm địa điểm
            </Button>
          </form>
          {search && searchResult.isFetching && <p role="status">Đang tìm địa điểm…</p>}
          {searchResult.isError && (
            <p role="alert">
              Chưa tìm được địa điểm từ nhà cung cấp. Bạn vẫn có thể thêm thủ công.
            </p>
          )}
          {searchResult.data && (
            <>
              <ProviderSource meta={searchResult.data.meta} timezone={props.trip.timezone} />
              {!searchResult.data.data?.length && (
                <p role="status">
                  Không có kết quả khả dụng. Tìm kiếm không làm thay đổi danh sách đã lưu.
                </p>
              )}
              {searchResult.data.data?.map((place) => {
                const saved = props.plan.selectedLocations.find(
                  (v) =>
                    v.provider === place.provider && v.providerPlaceId === place.providerPlaceId,
                );
                return (
                  <article key={`${place.provider}:${place.providerPlaceId}`}>
                    <h3>{place.name}</h3>
                    <p>{place.address ?? 'Chưa có địa chỉ'}</p>
                    <p>
                      {place.latitude !== null
                        ? `${place.latitude}, ${place.longitude}`
                        : 'Chưa có tọa độ'}
                    </p>
                    {saved ? (
                      <p>Đã lưu: {saved.name}</p>
                    ) : (
                      <PreparationActions module="location" candidate={place} {...props} />
                    )}
                  </article>
                );
              })}
            </>
          )}
        </section>
      )}
      {props.plan.capabilities?.routes && (
        <section className={styles.form}>
          <h2>Xem tuyến đường</h2>
          <Select label="Điểm đi" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Chọn điểm đi</option>
            {locations.map((v) => (
              <option value={v.id} key={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Select label="Điểm đến" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Chọn điểm đến</option>
            {locations.map((v) => (
              <option value={v.id} key={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Select
            label="Di chuyển bằng"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="WALKING">Đi bộ</option>
            <option value="DRIVING">Ô tô</option>
            <option value="CYCLING">Xe đạp</option>
          </Select>
          <Button
            disabled={!service || !from || !to || from === to || routeResult.isFetching}
            onClick={() =>
              setRequest({ from, to, mode, version: props.plan.planVersion, nonce: Date.now() })
            }
          >
            Xem tuyến đường
          </Button>
          {routeResult.isFetching && <p role="status">Đang lấy tuyến đường…</p>}
          {routeResult.isError && (
            <p role="alert">Không lấy được tuyến đường. Chưa thể đánh giá thời gian di chuyển.</p>
          )}
          {request && request.version !== props.plan.planVersion && (
            <p role="status">Plan đã đổi. Hãy lấy lại tuyến đường cho dữ liệu hiện tại.</p>
          )}
          {route && (
            <>
              <ProviderSource meta={route.meta} timezone={props.trip.timezone} />
              {route.data ? (
                <p role="status">
                  {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(
                    route.data.distanceM / 1000,
                  )}{' '}
                  km · {Math.ceil(route.data.durationSeconds / 60)} phút ước tính. Xem tuyến không
                  thay đổi lịch trình.
                </p>
              ) : (
                <p role="status">
                  Chưa có tuyến đường khả dụng; chưa thể đánh giá lịch trình về mặt di chuyển.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </Card>
  );
}
