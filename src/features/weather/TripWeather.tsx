import type { PlanViewModel } from '../plan/model/plan';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { useTripWeather } from './use-trip-weather';
import { weatherTemperature } from './weather';
import styles from './TripWeather.module.css';

type Props = { trip: TripDetailViewModel; plan: PlanViewModel | null; date: string };

function weatherMessage({ query, available, location }: ReturnType<typeof useTripWeather>) {
  if (!available) return location ? 'Chưa có dữ liệu' : 'Chưa có địa điểm có tọa độ';
  if (query.isPending) return 'Đang tải thời tiết';
  if (query.isError) return 'Chưa tải được thời tiết';
  if (!query.data?.data)
    return query.data?.source.warnings.includes('FORECAST_OUT_OF_RANGE')
      ? 'Chưa có dự báo cho ngày này'
      : 'Chưa có dữ liệu thời tiết';
  return null;
}

export function TripWeatherSummary(props: Props) {
  const state = useTripWeather(props);
  const { query, location } = state;
  const forecast = state.available ? query.data?.data : null;
  const source = state.available ? query.data?.source : null;
  const message = weatherMessage(state);
  return (
    <div
      className={styles.summary}
      aria-label={`Thời tiết ${props.date}${location ? ` tại ${location.name}` : ''}`}
      title={[location?.name, forecast ? weatherTemperature(forecast) : null]
        .filter(Boolean)
        .join(' · ')}
    >
      <strong className={styles.temperature}>
        {forecast ? weatherTemperature(forecast, true) : '—'}
      </strong>
      <span className={styles.detail}>
        {source?.isMock && 'Dữ liệu mô phỏng · '}
        {source?.stale && 'Dự báo cũ · '}
        {message ?? (
          <>
            {location?.name}
            {forecast?.rainProbability !== null &&
              forecast?.rainProbability !== undefined &&
              ` · Mưa ${Math.round(forecast.rainProbability * 100)}%`}
            {forecast?.uvIndex !== null &&
              forecast?.uvIndex !== undefined &&
              ` · UV ${forecast.uvIndex}`}
          </>
        )}
      </span>
      {source && <WeatherAttribution source={source} compact />}
      {query.isError && (
        <button className={styles.retry} type="button" onClick={() => void query.refetch()}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function TripWeatherChip(props: Props) {
  const state = useTripWeather(props);
  const data = state.available ? state.query.data : undefined;
  const message = weatherMessage(state);
  const title = [
    state.location?.name,
    data?.data ? weatherTemperature(data.data) : message,
    data?.source.isMock ? 'Dữ liệu mô phỏng' : null,
    data?.source.stale ? 'Dự báo cũ' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const temperature = data?.data?.temperatureMaxC ?? data?.data?.temperatureMinC;
  return (
    <span title={title} aria-label={`Thời tiết ${title}`}>
      {temperature === null || temperature === undefined ? '—' : `${Math.round(temperature)}°`}
    </span>
  );
}

function WeatherAttribution({
  source,
  compact = false,
}: {
  source: NonNullable<ReturnType<typeof useTripWeather>['query']['data']>['source'];
  compact?: boolean;
}) {
  return (
    <span className={styles.attribution}>
      {source.attribution.map((credit) =>
        credit.url ? (
          <a
            key={credit.text}
            href={credit.url}
            target="_blank"
            rel="noreferrer"
            aria-label={credit.text}
            title={credit.text}
          >
            {compact && /^https:\/\/open-meteo\.com\/?$/.test(credit.url)
              ? 'Open-Meteo.com'
              : credit.text}
          </a>
        ) : (
          <span key={credit.text}>{credit.text}</span>
        ),
      )}
      {source.fetchedAt && (
        <time
          dateTime={source.fetchedAt}
          title={new Date(source.fetchedAt).toLocaleString('vi-VN')}
        >
          Cập nhật{' '}
          {new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh',
          }).format(new Date(source.fetchedAt))}
        </time>
      )}
    </span>
  );
}

export function TripWeatherCredit(props: Props) {
  const { query, available } = useTripWeather(props);
  return available && query.data ? (
    <span className={styles.credit}>
      {query.data.source.isMock && <span>Dữ liệu thời tiết mô phỏng</span>}
      {query.data.source.stale && <span>Dự báo thời tiết cũ</span>}
      <WeatherAttribution source={query.data.source} compact />
    </span>
  ) : null;
}
