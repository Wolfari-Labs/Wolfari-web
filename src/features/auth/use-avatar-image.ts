import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptionalIdentityRepository } from './repositories/identity-context';

export function useAvatarImage({
  userId,
  version,
  enabled,
}: {
  userId: string | undefined;
  version: number | undefined;
  enabled: boolean;
}) {
  const repository = useOptionalIdentityRepository();
  const queryKey = ['identity', 'avatar', userId, version] as const;
  const avatarQuery = useQuery({
    queryKey,
    enabled: enabled && userId !== undefined && version !== undefined && !!repository?.getAvatar,
    queryFn: async ({ signal }) => {
      if (!repository?.getAvatar) throw new Error('Avatar repository unavailable');
      const result = await repository.getAvatar({ signal });
      if (result.status !== 'ready') throw new Error(result.error.code);
      return { bytes: result.bytes, contentType: result.contentType };
    },
    // The profile version is the cache boundary for the private avatar endpoint.
    staleTime: Infinity,
    retry: false,
  });
  const cacheIdentity = JSON.stringify([userId ?? null, version ?? null]);
  const [objectUrl, setObjectUrl] = useState<{ identity: string; src: string } | null>(null);
  const avatar = avatarQuery.data;

  useEffect(() => {
    if (!avatar || typeof URL.createObjectURL !== 'function') {
      setObjectUrl(null);
      return;
    }
    const src = URL.createObjectURL(
      new Blob([avatar.bytes], { type: avatar.contentType ?? 'image/png' }),
    );
    setObjectUrl({ identity: cacheIdentity, src });
    return () => URL.revokeObjectURL(src);
  }, [avatar, cacheIdentity]);

  return {
    src: objectUrl?.identity === cacheIdentity ? objectUrl.src : null,
    error: avatarQuery.isError,
  };
}
