import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useTripRepository } from '../trips/repositories/repository-context';
import type { PlanEditPolicy, PlanPolicySnapshot } from '../trips/repositories/trip.repository';
import { useMembersRepositories } from './repositories/members-context';
import { useIdentityRepository } from '../auth/repositories/identity-context';
import type { CommandCoordinator } from '../../shared/types/operations';
import {
  loadPolicyIntent,
  persistPolicyIntent,
  type PolicyIntent,
} from '../../shared/lib/runtime-validation';
import { browserStorage } from '../../shared/lib/browser-storage';
import { unresolved } from '../../shared/types/operations';
import { useCommandSession, OperationStatus } from '../../shared/components/OperationStatus';
import { InvitationManagement } from './InvitationManagement';
import { TripHero } from '../trips/components/TripHero';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Ui';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { Input } from '../../shared/components/Input';
import { Drawer } from '../../shared/components/Drawer';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import type { MembershipViewModel } from './model/members';
import type { DomainError } from '../../shared/types/result';
import { paths } from '../../app/route-paths';
import styles from '../../shared/styles/DemoWorkspace.module.css';

function Workspace({
  actorId,
  tripId,
  commands,
}: {
  actorId: string;
  tripId: string;
  commands: CommandCoordinator;
}) {
  const repo = useTripRepository(),
    { membership } = useMembersRepositories(),
    qc = useQueryClient();
  const session = commands.forScope(actorId, tripId);
  const refresh = useCallback(() => {
    for (const queryKey of [
      ['trip', 'detail', tripId],
      ['members', tripId],
      ['plan', tripId],
      ['shell'],
      ['trips', 'list'],
      ['plan-policy', actorId, tripId],
      ['finance', actorId, tripId],
    ])
      void qc.invalidateQueries({ queryKey });
  }, [qc, actorId, tripId]);
  const operation = useCommandSession(session, refresh);
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => repo.getTrip({ tripId, signal, scenario: 'success' }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const readable =
    !!trip &&
    trip.permissions.canRead &&
    trip.currentMembership.userId === actorId &&
    !trip.currentMembership.leftAt;
  const owner = readable && trip.currentMembership.role === 'OWNER';
  const [tab, setTab] = useState<'members' | 'policy' | 'invitations'>('members');
  const [includeLeft, setIncludeLeft] = useState(false);
  const [target, setTarget] = useState<MembershipViewModel | 'self' | null>(null);
  const [reason, setReason] = useState('');
  const [initialPolicy] = useState(() => {
    try {
      const storage = browserStorage('sessionStorage');
      if (!storage) throw Error('Storage denied');
      return { intent: loadPolicyIntent(actorId, tripId, storage), blocked: false };
    } catch {
      return { intent: null, blocked: true };
    }
  });
  const [policyStorageBlocked, setPolicyStorageBlocked] = useState(initialPolicy.blocked);
  const [draft, setDraft] = useState<PlanPolicySnapshot | null>(initialPolicy.intent);
  const [policyBusy, setPolicyBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  const [policyError, setPolicyError] = useState<DomainError | null>(null);
  const policyIntent = useRef<PolicyIntent | null>(initialPolicy.intent);
  const [policyUnknown, setPolicyUnknown] = useState(!!initialPolicy.intent);
  const savePolicyJournal = (intent: PolicyIntent | null) => {
    try {
      const storage = browserStorage('sessionStorage');
      if (!storage) throw Error('Storage denied');
      persistPolicyIntent(actorId, tripId, intent, storage);
      return true;
    } catch {
      setPolicyStorageBlocked(true);
      return false;
    }
  };
  const policyQuery = useQuery({
    queryKey: ['plan-policy', actorId, tripId],
    enabled: owner && !!repo.getPlanPolicy,
    queryFn: ({ signal }) => repo.getPlanPolicy!({ tripId, signal }),
  });
  const policy = policyQuery.data?.status === 'ready' ? policyQuery.data.data : null;
  const selected = draft ?? policy;
  const members = useInfiniteQuery({
    queryKey: ['members', tripId, 'runtime', actorId, includeLeft],
    enabled: readable,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => {
      const result = await membership.listMembers({
        tripId,
        scenario: 'success',
        signal,
        includeLeft,
        limit: 100,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      if (result.status === 'error') throw result.error;
      return result.status === 'ready' ? result.data : { items: [], nextCursor: null };
    },
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const items = [
    ...new Map((members.data?.pages.flatMap((p) => p.items) ?? []).map((m) => [m.id, m])).values(),
  ];
  const blocked = operation.busy || unresolved(operation) || !!trip?.archivedAt;
  const savePolicy = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !owner ||
      !selected ||
      !policy ||
      !repo.updatePlanPolicy ||
      policyBusy ||
      policyStorageBlocked
    )
      return;
    const intent = policyIntent.current ?? {
      ...selected,
      editorMemberIds:
        selected.policy === 'SELECTED_MEMBERS' ? [...selected.editorMemberIds].sort() : [],
      membershipRevision: policy.membershipRevision,
      key: crypto.randomUUID(),
    };
    if (!savePolicyJournal(intent)) return;
    policyIntent.current = intent;
    setPolicyBusy(true);
    setPolicyError(null);
    setFeedback('');
    try {
      const result = await repo.updatePlanPolicy({
        tripId,
        policy: intent.policy,
        editorMemberIds: intent.editorMemberIds,
        expectedMembershipRevision: intent.membershipRevision,
        idempotencyKey: intent.key,
        signal: new AbortController().signal,
      });
      if (result.status === 'unknown') {
        setPolicyUnknown(true);
        setPolicyError(result.error);
        setFeedback('Chưa rõ kết quả. Thử lại cùng yêu cầu và danh sách đã chọn.');
      } else if (result.status === 'error') {
        if (!savePolicyJournal(null)) return;
        policyIntent.current = null;
        setPolicyUnknown(false);
        setPolicyError(result.error);
        setFeedback(
          ['STATE_CONFLICT', 'VERSION_CONFLICT'].includes(result.error.code)
            ? 'Quyền chuyến đi đã thay đổi. Bản nháp được giữ; tải quyền hiện hành rồi xác nhận lại.'
            : 'Không lưu được. Bản nháp được giữ; tải quyền hiện hành rồi xác nhận lại.',
        );
        refresh();
      } else {
        const fresh = await policyQuery.refetch();
        // OWNER_ONLY/ALL_MEMBERS require an empty request list but preserve saved,
        // inactive assignments. Compare with the authoritative receipt, not the input.
        if (
          fresh.data?.status === 'ready' &&
          fresh.data.data.membershipRevision >= result.data.membershipRevision &&
          fresh.data.data.policy === result.data.policy &&
          [...fresh.data.data.editorMemberIds].sort().join() ===
            [...result.data.editorMemberIds].sort().join()
        ) {
          if (!savePolicyJournal(null)) return;
          policyIntent.current = null;
          setPolicyUnknown(false);
          setDraft(null);
          setFeedback('Đã lưu quyền sửa lịch trình.');
          refresh();
        } else {
          setPolicyUnknown(true);
          setFeedback(
            'Đã nhận phản hồi nhưng chưa xác nhận được quyền hiện tại. Giữ yêu cầu để kiểm tra lại.',
          );
        }
      }
    } catch {
      setPolicyUnknown(true);
      setFeedback('Mất kết nối. Thử lại cùng yêu cầu khi kết nối phục hồi.');
    } finally {
      setPolicyBusy(false);
    }
  };
  const submitLifecycle = async (e: FormEvent) => {
    e.preventDefault();
    if (!trip || !target || !reason.trim() || blocked) return;
    await session.submit({
      actorId,
      tripId,
      kind: target === 'self' ? 'leave' : 'remove',
      ...(target === 'self' ? {} : { resourceId: target.id }),
      body: { reason: reason.trim(), expected_membership_revision: trip.membershipRevision },
    });
    setTarget(null);
    setReason('');
  };
  return (
    <>
      <OperationStatus session={session} />
      {!readable ? (
        tripQuery.isPending ? (
          <ContentState state="loading" />
        ) : (
          <>
            <ContentState
              state="error"
              error={
                tripQuery.data?.status === 'error'
                  ? tripQuery.data.error
                  : { code: 'PERMISSION_DENIED', correlationId: null, retryable: false }
              }
              onRetry={() => void tripQuery.refetch()}
            />
            <p>Thao tác đã gửi vẫn có thể kiểm tra kết quả ở phía trên sau khi rời chuyến đi.</p>
            <Link to={paths.trips}>Về danh sách chuyến đi</Link>
          </>
        )
      ) : (
        <>
          <TripHero trip={trip} compact variant="landscape" />
          <div className={styles.actions} role="group" aria-label="Nội dung thành viên">
            <Button
              variant={tab === 'members' ? 'secondary' : 'outline'}
              aria-pressed={tab === 'members'}
              onClick={() => setTab('members')}
            >
              Thành viên
            </Button>
            {owner && (
              <>
                <Button
                  variant={tab === 'invitations' ? 'secondary' : 'outline'}
                  aria-pressed={tab === 'invitations'}
                  onClick={() => setTab('invitations')}
                >
                  Lời mời
                </Button>
                <Button
                  variant={tab === 'policy' ? 'secondary' : 'outline'}
                  aria-pressed={tab === 'policy'}
                  onClick={() => setTab('policy')}
                >
                  Quyền sửa lịch trình
                </Button>
              </>
            )}
            <Button variant="plain" onClick={refresh}>
              Tải lại quyền và thành viên
            </Button>
          </div>
          {tab === 'invitations' && owner ? (
            <InvitationManagement key={actorId + ':' + tripId} trip={trip} active />
          ) : tab === 'policy' && owner ? (
            <section className={styles.panel}>
              <h2>Quyền sửa lịch trình</h2>
              <p>
                Chọn người được sửa lịch trình. Thành viên rời rồi tham gia lại cần được cấp quyền
                lại.
              </p>
              {policyQuery.data?.status === 'error' ? (
                <ContentState
                  state="error"
                  error={policyQuery.data.error}
                  onRetry={() => void policyQuery.refetch()}
                />
              ) : selected ? (
                <form className={styles.form} onSubmit={(e) => void savePolicy(e)}>
                  {policyStorageBlocked && (
                    <Alert tone="error">
                      Chưa thể phục hồi yêu cầu trước. Tạm khóa thay đổi để tránh gửi trùng; vui
                      lòng liên hệ hỗ trợ.
                    </Alert>
                  )}
                  {policyUnknown && !feedback && (
                    <Alert tone="warning">
                      Chưa xác nhận được thay đổi trước đó. Thử lại đúng yêu cầu để kiểm tra kết
                      quả.
                    </Alert>
                  )}
                  {feedback && (
                    <Alert live tone={policyError || policyUnknown ? 'warning' : 'success'}>
                      {feedback}
                    </Alert>
                  )}
                  <Select
                    label="Ai có thể sửa lịch trình"
                    value={selected.policy}
                    disabled={policyBusy || policyUnknown || !!trip.archivedAt}
                    onChange={(e) =>
                      setDraft({ ...selected, policy: e.target.value as PlanEditPolicy })
                    }
                  >
                    <option value="OWNER_ONLY">Chỉ chủ chuyến</option>
                    <option value="ALL_MEMBERS">Mọi thành viên đang hoạt động</option>
                    <option value="SELECTED_MEMBERS">Thành viên được chọn</option>
                  </Select>
                  {selected.policy === 'SELECTED_MEMBERS' && (
                    <fieldset className={styles.checks}>
                      <legend>Thành viên được cấp quyền</legend>
                      {items
                        .filter((m) => !m.leftAt && m.role !== 'OWNER')
                        .map((m) => (
                          <label key={m.id}>
                            <input
                              type="checkbox"
                              checked={selected.editorMemberIds.includes(m.id)}
                              disabled={policyBusy || policyUnknown || !!trip.archivedAt}
                              onChange={(e) =>
                                setDraft({
                                  ...selected,
                                  editorMemberIds: e.target.checked
                                    ? [...selected.editorMemberIds, m.id]
                                    : selected.editorMemberIds.filter((id) => id !== m.id),
                                })
                              }
                            />
                            {m.presentation.displayName ?? `User ${m.userId.slice(0, 8)}`}
                          </label>
                        ))}
                    </fieldset>
                  )}
                  {selected.policy !== 'SELECTED_MEMBERS' && (
                    <p>
                      Lựa chọn từng thành viên được giữ lại và chỉ áp dụng khi chọn “Thành viên được
                      chọn”.
                    </p>
                  )}
                  {members.hasNextPage && (
                    <Button variant="outline" onClick={() => void members.fetchNextPage()}>
                      Tải thêm thành viên
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={policyBusy || policyStorageBlocked || !!trip.archivedAt}
                    loading={policyBusy}
                  >
                    {policyUnknown ? 'Thử lại cùng yêu cầu quyền' : 'Lưu quyền'}
                  </Button>
                  {policyError && (
                    <details>
                      <summary>Chi tiết hỗ trợ</summary>
                      <p>
                        {policyError.code} · {policyError.correlationId}
                      </p>
                    </details>
                  )}
                </form>
              ) : (
                <ContentState state="loading" />
              )}
            </section>
          ) : (
            <section className={styles.panel} aria-label="Danh sách thành viên">
              <h2>
                <Icon name="members" />
                Thành viên chuyến đi
              </h2>
              <label>
                <input
                  type="checkbox"
                  checked={includeLeft}
                  onChange={(e) => setIncludeLeft(e.target.checked)}
                />{' '}
                Hiển thị người đã rời
              </label>
              {members.isFetchNextPageError ? (
                <Alert live tone="warning">
                  Chưa tải được trang tiếp theo. Các thành viên đã tải vẫn được giữ.{' '}
                  <Button variant="outline" onClick={() => void members.fetchNextPage()}>
                    Thử lại trang này
                  </Button>
                </Alert>
              ) : (
                members.isError && (
                  <ContentState
                    state="error"
                    error={members.error as unknown as DomainError}
                    onRetry={() => void members.refetch()}
                  />
                )
              )}
              <p>
                {items.length} thành viên đã tải
                {members.hasNextPage ? ' · Còn trang tiếp theo' : ''}
              </p>
              <ul className={styles.list}>
                {items.map((m) => (
                  <li key={m.id}>
                    <div className={styles.memberIdentity}>
                      <Avatar
                        name={m.presentation.displayName ?? m.userId.slice(0, 8)}
                        image={m.presentation.avatar}
                      />
                      <strong>
                        {m.presentation.displayName ?? `User ${m.userId.slice(0, 8)}`}
                      </strong>
                      <Badge tone={m.role === 'OWNER' ? 'success' : 'neutral'}>
                        {m.role === 'OWNER' ? 'Chủ chuyến' : 'Thành viên'}
                      </Badge>
                      {m.userId === actorId && <Badge>Bạn</Badge>}
                      {m.leftAt && <Badge tone="warning">· Đã rời</Badge>}
                    </div>
                    <details>
                      <summary>Chi tiết hỗ trợ</summary>
                      <p>
                        Membership: {m.id}
                        <br />
                        User: {m.userId}
                      </p>
                    </details>
                    {owner && m.role !== 'OWNER' && !m.leftAt && (
                      <Button variant="outline" disabled={blocked} onClick={() => setTarget(m)}>
                        Xóa thành viên · {m.presentation.displayName ?? m.userId.slice(0, 8)}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {members.hasNextPage && (
                <Button
                  disabled={members.isFetchingNextPage}
                  onClick={() => void members.fetchNextPage()}
                >
                  Tải thêm thành viên
                </Button>
              )}

              {!owner && (
                <Button variant="outline" disabled={blocked} onClick={() => setTarget('self')}>
                  Rời chuyến đi
                </Button>
              )}
            </section>
          )}
        </>
      )}
      <Drawer
        open={target !== null}
        label={target === 'self' ? 'Rời chuyến đi' : 'Xóa thành viên'}
        side="right"
        onDismiss={() => setTarget(null)}
      >
        <form className={styles.form} onSubmit={(e) => void submitLifecycle(e)}>
          <Alert tone="warning">
            Cần giải quyết trách nhiệm và khoản đóng góp còn chờ trước khi rời chuyến. Khoản đã xác
            nhận vẫn được giữ; quyền sửa lịch trình sẽ cần cấp lại khi tham gia lại.
          </Alert>
          <Input
            label="Lý do rời/xóa"
            value={reason}
            maxLength={1000}
            required
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" disabled={blocked || !reason.trim()}>
            Xác nhận rời/xóa
          </Button>
        </form>
      </Drawer>
    </>
  );
}
export function GatewayMembersPage({ commands }: { commands: CommandCoordinator }) {
  const { tripId = '' } = useParams(),
    identity = useIdentityRepository();
  const actor = useQuery({
    queryKey: ['demo1', 'actor'],
    queryFn: ({ signal }) => identity.readSelf({ signal }),
  });
  return (
    <section className={styles.page}>
      <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
      <h1>Thành viên</h1>
      {actor.data?.status === 'ready' ? (
        <Workspace
          key={actor.data.data.id + ':' + tripId}
          actorId={actor.data.data.id}
          tripId={tripId}
          commands={commands}
        />
      ) : actor.isPending ? (
        <ContentState state="loading" />
      ) : (
        <ContentState
          state="error"
          error={
            actor.data?.status === 'error'
              ? actor.data.error
              : { code: 'UNAUTHENTICATED', correlationId: null, retryable: true }
          }
        />
      )}
    </section>
  );
}
