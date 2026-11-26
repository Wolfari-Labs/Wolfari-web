import { useInfiniteQuery } from '@tanstack/react-query';
import { useRuntimeServices } from '../../../app/gateway-context';
import { ContentState } from '../../../shared/components/ContentState';
import { toDomainError } from '../../../shared/lib/runtime-validation';
import styles from '../TripDashboard.module.css';
import { OverviewEmptyFare } from './OverviewEmptyFare';
import { flightProviderLabels } from '../../price-watch/model/runtime-price-watch';

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
  const loaded = query.data.pages.flatMap((page) => page.items);
  const count = new Set(loaded.map((watch) => watch.id)).size;
  const sources = [...new Set(loaded.map((watch) => flightProviderLabels[watch.fields.provider]))];
  return count ? (
    <>
      <p className={styles.summaryValue}>
        {count}
        {query.hasNextPage ? '+' : ''} mục
      </p>
      <p className={styles.summaryDetail}>Nguồn giá · {sources.join(', ')}</p>
    </>
  ) : (
    <OverviewEmptyFare />
  );
}
