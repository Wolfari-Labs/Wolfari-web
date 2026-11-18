import { useState } from 'react';
import { Select } from '../../shared/components/Select';
import { calendarDate } from '../../shared/lib/calendar';
import type { PlanViewModel } from '../plan/model/plan';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import {
  dressRegion,
  dressSuggestionText,
  dressSuggestions,
  dressWeather,
  dressWeatherOptions,
  type DressWeather,
} from './dress-suggestions';
import styles from './DressSuggestions.module.css';

interface Props {
  trip: Pick<TripDetailViewModel, 'name' | 'startAt' | 'timezone'>;
  plan: Pick<PlanViewModel, 'activities' | 'selectedLocations'>;
  scopeType: string;
  planDate: string;
  activityId: string;
  onPick: (value: { label: string; description: string }) => void;
}

/** Quick picks for the dress code editor; picking one only fills the form, it does not save. */
export function DressSuggestions({ trip, plan, scopeType, planDate, activityId, onPick }: Props) {
  const [chosen, setChosen] = useState<DressWeather | null>(null);
  const places = [
    trip.name,
    ...plan.selectedLocations.flatMap((item) => [item.name, item.address ?? '']),
  ];
  const latitudes = plan.selectedLocations
    .flatMap((item) => (item.latitude === null ? [] : [Number(item.latitude)]))
    .filter(Number.isFinite);
  const latitude = latitudes.length
    ? latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length
    : null;
  const day =
    scopeType === 'DAY' && planDate ? planDate : calendarDate(trip.startAt, trip.timezone);
  const guessed = dressWeather(dressRegion(places, latitude), Number(day.slice(5, 7)));
  const weather = chosen ?? guessed;
  // An Activity dress code is matched against that Activity only; other scopes use the whole Plan.
  const activity = plan.activities.find((item) => item.id === activityId);
  const texts =
    scopeType === 'ACTIVITY'
      ? activity
        ? [activity.title]
        : []
      : [...places, ...plan.activities.map((item) => item.title)];
  return (
    <section className={styles.box} aria-label="Gợi ý nhanh">
      <Select
        label="Thời tiết dự kiến"
        value={weather}
        onChange={(event) => setChosen(event.target.value as DressWeather)}
      >
        {dressWeatherOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.value === guessed ? ' (theo nơi và tháng đi)' : ''}
          </option>
        ))}
      </Select>
      <p className={styles.hint}>Chọn một gợi ý để điền sẵn, rồi sửa lại nếu cần.</p>
      <ul className={styles.list}>
        {dressSuggestions(weather, texts).map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              className={styles.pick}
              onClick={() =>
                onPick({ label: suggestion.label, description: dressSuggestionText(suggestion) })
              }
            >
              <span className={styles.swatches} aria-hidden="true">
                {suggestion.colors.map((color) => (
                  <span key={color.hex} style={{ backgroundColor: color.hex }} />
                ))}
              </span>
              <span className={styles.text}>
                <strong>{suggestion.label}</strong>
                <small>{suggestion.colors.map((color) => color.name).join(' · ')}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
