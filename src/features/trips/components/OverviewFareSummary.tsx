import { useInfiniteQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../../app/gateway-context';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from '../TripDashboard.module.css';
import { OverviewEmptyFare } from './OverviewEmptyFare';

export function OverviewFareSummary({ tripId, actor }: { tripId: string; actor: string }) {
  const repository = useRuntimeServices()?.priceWatch;
  const query = useInfiniteQuery({
    queryKey: ['price-watches', actor, tripId],
    enabled: !!repository,
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => repository!.list(tripId, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  if (!repository) return <p className={styles.unavailable}>Chưa khả dụng</p>;
  if (query.isPending) return <ContentState state="loading" headingLevel={2} />;
  if (query.isError)
    return (
      <ContentState
        state="error"
        error={toDomainError(query.error)}
        onRetry={() => void query.refetch()}
        headingLevel={2}
      />
    );
  const count = new Set(query.data.pages.flatMap((page) => page.items.map((watch) => watch.id)))
    .size;
  return count ? (
    <>
      <p>
        {count}
        {query.hasNextPage ? '+' : ''} mục theo dõi
      </p>
      <p className={styles.summaryDetail}>Nguồn mô phỏng · MOCK_FLIGHT</p>
    </>
  ) : (
    <OverviewEmptyFare />
  );
}
