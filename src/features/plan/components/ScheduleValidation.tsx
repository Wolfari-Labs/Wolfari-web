import { useQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../../app/gateway-context';
import { Alert } from '../../../shared/components/Alert';
import type { PreparationProps } from './PreparationActions';
import type { ActivityViewModel } from '../model/plan';

export function overlappingActivities(
  activities: readonly Pick<ActivityViewModel, 'id' | 'title' | 'startsAt' | 'endsAt'>[],
) {
  return activities.flatMap((a, index) =>
    activities
      .slice(index + 1)
      .filter(
        (b) =>
          a.startsAt &&
          a.endsAt &&
          b.startsAt &&
          b.endsAt &&
          Date.parse(a.startsAt) < Date.parse(b.endsAt) &&
          Date.parse(b.startsAt) < Date.parse(a.endsAt),
      )
      .map((b) => ({ ids: [a.id, b.id], message: `Trùng giờ: ${a.title} và ${b.title}` })),
  );
}
export function ScheduleValidation({ trip, plan }: PreparationProps) {
  const service = useRuntimeServices()?.travel;
  const result = useQuery({
    queryKey: ['schedule-validation', trip.id, trip.currentMembership.userId, plan.planVersion],
    enabled: !!service && !!plan.capabilities?.schedule_validation,
    retry: false,
    queryFn: ({ signal }) => service!.validateSchedule(trip.id, plan.planVersion, signal),
  });
  const overlaps = overlappingActivities(plan.activities);
  if (!plan.capabilities?.schedule_validation && !overlaps.length) return null;
  return (
    <Alert>
      <p>Kiểm tra lịch trình đã lưu</p>
      {overlaps.map((w) => (
        <p key={w.ids.join(':')}>{w.message}</p>
      ))}
      {result.data?.warnings.map((w, i) => (
        <p key={i}>{w.message}</p>
      ))}
      {!plan.capabilities?.schedule_validation ||
      !service ||
      result.isError ||
      result.data?.uncheckedRoutes.length ? (
        <p>
          Chưa đánh giá được một phần hoặc toàn bộ thời gian di chuyển. Dữ liệu đã lưu không bị thay
          đổi.
        </p>
      ) : result.isFetching ? (
        <p>Đang kiểm tra thời gian di chuyển…</p>
      ) : null}
    </Alert>
  );
}
