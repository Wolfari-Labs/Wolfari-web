import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentState } from '../../shared/components/ContentState';
import { Button } from '../../shared/components/Button';
import { useMembersRepositories } from './repositories/members-context';

function tokenFromFragment(): string | null {
  const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return value;
}

export function InvitationPage() {
  const { invitation } = useMembersRepositories();
  const queryClient = useQueryClient();
  const [token] = useState(tokenFromFragment);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['invitation', 'preview', token],
    enabled: Boolean(token && invitation.previewInvitation),
    queryFn: ({ signal }) => invitation.previewInvitation!({ token: token!, signal }),
  });
  if (!token) return <ContentState state="error" headingLevel={1} />;
  if (!invitation.previewInvitation || !invitation.acceptInvitation || !invitation.declineInvitation)
    return <ContentState state="unavailable" headingLevel={1} />;
  if (query.isPending) return <ContentState state="loading" headingLevel={1} />;
  if (query.data?.status === 'error')
    return <ContentState state="error" headingLevel={1} error={query.data.error} onRetry={() => void query.refetch()} />;
  if (query.isError)
    return <ContentState state="error" headingLevel={1} onRetry={() => void query.refetch()} />;
  if (query.data?.status !== 'success') return <ContentState state="empty" headingLevel={1} />;
  const preview = query.data.data;
  const run = async (kind: 'accept' | 'decline') => {
    setActionError(null);
    const result = kind === 'accept'
      ? await invitation.acceptInvitation!({ token, idempotencyKey: crypto.randomUUID(), signal: new AbortController().signal })
      : await invitation.declineInvitation!({ token, idempotencyKey: crypto.randomUUID(), signal: new AbortController().signal });
    if (result.status === 'error') {
      setActionError(result.error.code);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['trip'] });
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    await queryClient.invalidateQueries({ queryKey: ['plan'] });
    void query.refetch();
  };
  return (
    <section>
      <h1>Lời mời chuyến đi</h1>
      <p>{preview.inviterDisplayName} mời bạn tham gia {preview.tripName}.</p>
      <p>Trạng thái: {preview.status}</p>
      {actionError && <p role="alert">Không thể hoàn tất: {actionError}</p>}
      {preview.status === 'PENDING' && (
        <div>
          <Button onClick={() => void run('accept')}>Chấp nhận</Button>
          <Button variant="outline" onClick={() => void run('decline')}>Từ chối</Button>
        </div>
      )}
    </section>
  );
}
