import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTripRepository } from '../repositories/repository-context';

export function useTripCoverImage(tripId: string, available: boolean) {
  const repository = useTripRepository();
  const query = useQuery({
    queryKey: ['trip', 'cover', tripId],
    enabled: !!tripId && available && !!repository.getCover,
    queryFn: ({ signal }) => repository.getCover!({ tripId, signal }),
    staleTime: 60_000,
  });
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data) {
      setSrc(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);
  return { ...query, src };
}
