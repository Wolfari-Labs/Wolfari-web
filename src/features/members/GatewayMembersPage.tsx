import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useTripRepository } from '../trips/repositories/repository-context';
import type { PlanPolicySnapshot } from '../trips/repositories/trip.repository';
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
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Drawer } from '../../shared/components/Drawer';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import type { MembershipViewModel } from './model/members';
import type { DomainError } from '../../shared/types/result';
import { paths } from '../../app/route-paths';
import styles from './GatewayMembersPage.module.css';

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
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const lifecycleOrigin = useRef<HTMLElement | null>(null);
  const lifecycleReturnFocus = {
    get current() {
      const origin = lifecycleOrigin.current;
      return origin?.isConnected && !origin.matches(':disabled') ? origin : workspaceRef.current;
    },
  };
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
    <div ref={workspaceRef} tabIndex={-1}>
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
          {trip.archivedAt && (
            <Alert>
              Chuyến đi đã lưu trữ. Bạn có thể xem nhưng không thay đổi thành viên, lời mời hoặc
              quyền sửa lịch trình.
            </Alert>
          )}
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
            <div className={styles.policyWorkspace}>
              <section
                className={styles.panel}
                data-cp08-primary
                aria-label="Chỉnh sửa quyền lịch trình"
              >
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
                    <fieldset
                      className={styles.radioGroup}
                      disabled={
                        policyBusy || policyUnknown || policyStorageBlocked || !!trip.archivedAt
                      }
                    >
                      <legend>Ai có thể sửa lịch trình</legend>
                      {(
                        [
                          ['OWNER_ONLY', 'Chỉ chủ chuyến', 'Chỉ Owner được chỉnh sửa lịch trình.'],
                          [
                            'ALL_MEMBERS',
                            'Mọi thành viên đang hoạt động',
                            'Owner và mọi Member đang tham gia được chỉnh sửa lịch trình.',
                          ],
                          [
                            'SELECTED_MEMBERS',
                            'Thành viên được chọn',
                            'Owner và các Member được chọn bên dưới được chỉnh sửa lịch trình.',
                          ],
                        ] as const
                      ).map(([value, label, description]) => (
                        <label className={styles.radioCard} key={value}>
                          <input
                            type="radio"
                            name="plan-edit-policy"
                            value={value}
                            aria-label={label}
                            checked={selected.policy === value}
                            onChange={() => setDraft({ ...selected, policy: value })}
                          />
                          <span>
                            <strong>{label}</strong>
                            <small>
                              {value} · {description}
                            </small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    {selected.policy === 'SELECTED_MEMBERS' && (
                      <fieldset className={styles.checks}>
                        <legend>Thành viên được cấp quyền</legend>
                        {members.isPending && <ContentState state="loading" headingLevel={2} />}
                        {members.isError && (
                          <Alert tone="warning">
                            Chưa tải đủ danh sách thành viên. Lựa chọn đã có được giữ.
                            <Button
                              variant="outline"
                              onClick={() =>
                                void (members.isFetchNextPageError
                                  ? members.fetchNextPage()
                                  : members.refetch())
                              }
                            >
                              Thử lại danh sách
                            </Button>
                          </Alert>
                        )}
                        {!members.isPending &&
                          !members.isError &&
                          !items.some((m) => !m.leftAt && m.role !== 'OWNER') && (
                            <p>Chưa có Member đang hoạt động trong các trang đã tải.</p>
                          )}
                        {items
                          .filter((m) => !m.leftAt && m.role !== 'OWNER')
                          .map((m) => (
                            <label key={m.id}>
                              <input
                                type="checkbox"
                                checked={selected.editorMemberIds.includes(m.id)}
                                disabled={
                                  policyBusy ||
                                  policyUnknown ||
                                  policyStorageBlocked ||
                                  !!trip.archivedAt
                                }
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
                        Lựa chọn từng thành viên được giữ lại và chỉ áp dụng khi chọn “Thành viên
                        được chọn”.
                      </p>
                    )}
                    {members.hasNextPage && (
                      <Button
                        variant="outline"
                        disabled={members.isFetchingNextPage}
                        onClick={() => void members.fetchNextPage()}
                      >
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
              <aside
                className={styles.guidance}
                aria-label="Hướng dẫn quyền sửa lịch trình"
                data-cp08-secondary
              >
                <div className={styles.note} data-tone="fund">
                  <h3>Điểm cần nhớ</h3>
                  <p>
                    Owner luôn có quyền sửa lịch trình. Thành viên rời rồi tham gia lại cần được cấp
                    quyền lại.
                  </p>
                </div>
                <div className={styles.note} data-tone="policy">
                  <h3>Không suy rộng quyền</h3>
                  <p>
                    Quyền sửa lịch trình không cấp quyền quản lý thành viên, lời mời hay trách nhiệm
                    quỹ.
                  </p>
                </div>
                <div className={styles.note}>
                  <h3>Kiểm tra tại thời điểm lưu</h3>
                  <p>
                    Hệ thống kiểm tra quyền hiện hành trước mỗi thay đổi. Khi kết quả chưa rõ, thử
                    lại cùng yêu cầu; chỉ báo đã lưu sau khi xác nhận dữ liệu mới.
                  </p>
                </div>
              </aside>
            </div>
          ) : (
            <div className={styles.workspace}>
              <section className={styles.panel} aria-label="Danh sách thành viên" data-cp08-primary>
                <h2>Thành viên chuyến đi</h2>
                <p className={styles.intro}>
                  Vai trò trong chuyến đi và trách nhiệm quỹ được quản lý riêng.
                </p>
                <label className={styles.check}>
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
                {members.isPending && <ContentState state="loading" headingLevel={2} />}
                {!members.isPending && !members.isError && items.length === 0 && (
                  <ContentState state="empty" headingLevel={2} />
                )}
                {members.data && (
                  <p className={styles.metadata}>
                    {items.length} thành viên đã tải
                    {members.hasNextPage ? ' · Còn trang tiếp theo' : ''}
                  </p>
                )}
                <ul className={styles.list}>
                  {items.map((m) => (
                    <li key={m.id}>
                      <div className={styles.memberRow}>
                        <div className={styles.memberIdentity}>
                          <Avatar
                            name={m.presentation.displayName ?? m.userId.slice(0, 8)}
                            image={m.presentation.avatar}
                          />
                          <div>
                            <strong>
                              {m.presentation.displayName ?? `User ${m.userId.slice(0, 8)}`}
                            </strong>
                            <span className={styles.metadata}>
                              Tham gia{' '}
                              {new Date(m.joinedAt).toLocaleDateString('vi-VN', {
                                timeZone: trip.timezone,
                              })}
                            </span>
                            {m.leftAt && (
                              <span className={styles.metadata}>
                                Đã rời{' '}
                                {new Date(m.leftAt).toLocaleDateString('vi-VN', {
                                  timeZone: trip.timezone,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.roles}>
                          <Badge tone={m.role === 'OWNER' ? 'success' : 'neutral'}>
                            {m.role === 'OWNER' ? 'Chủ chuyến' : 'Thành viên'}
                          </Badge>
                          {m.userId === actorId && <Badge>Bạn</Badge>}
                          {m.leftAt && <Badge tone="warning">· Đã rời</Badge>}
                        </div>
                        {owner && m.role !== 'OWNER' && !m.leftAt && (
                          <Button
                            variant="outline"
                            disabled={blocked}
                            aria-label={`Xóa thành viên · ${m.presentation.displayName ?? m.userId.slice(0, 8)}`}
                            onClick={(event) => {
                              lifecycleOrigin.current = event.currentTarget;
                              setTarget(m);
                            }}
                          >
                            Xóa thành viên
                          </Button>
                        )}
                      </div>
                      <details>
                        <summary>Chi tiết hỗ trợ</summary>
                        <p>
                          Membership: {m.id}
                          <br />
                          User: {m.userId}
                        </p>
                      </details>
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
                  <Button
                    variant="outline"
                    disabled={blocked}
                    onClick={(event) => {
                      lifecycleOrigin.current = event.currentTarget;
                      setTarget('self');
                    }}
                  >
                    Rời chuyến đi
                  </Button>
                )}
                <div className={styles.note} data-tone="owner">
                  <h3>Rời hoặc xóa thành viên</h3>
                  <p>
                    Hệ thống kiểm tra trách nhiệm quỹ và khoản đóng góp còn chờ. Thành viên chỉ thay
                    đổi sau khi có kết quả xác nhận; đóng hộp thoại không hủy yêu cầu đã gửi.
                  </p>
                </div>
              </section>
              <aside
                className={styles.guidance}
                aria-label="Quyền và trách nhiệm"
                data-cp08-secondary
              >
                <h2>Quyền &amp; trách nhiệm</h2>
                <div className={styles.note} data-tone="owner">
                  <h3>Owner</h3>
                  <p>
                    Mỗi chuyến đi có một chủ chuyến quản lý thành viên, lời mời và quyền sửa lịch
                    trình.
                  </p>
                </div>
                <div className={styles.note} data-tone="fund">
                  <h3>Fund Holder</h3>
                  <p>
                    Trách nhiệm quỹ độc lập với vai trò Owner. Xem thông tin người giữ quỹ tại Quỹ
                    nhóm.
                  </p>
                </div>
                <div className={styles.note} data-tone="policy">
                  <h3>Quyền sửa lịch trình</h3>
                  <p>
                    Chính sách này không cấp quyền quản lý thành viên hay xác nhận giao dịch quỹ.
                  </p>
                </div>
                <div className={styles.note}>
                  <h3>Chuyển Owner</h3>
                  <p>Thao tác chuyển chủ chuyến chưa được hỗ trợ trên giao diện hiện tại.</p>
                </div>
                <Link to={paths.fund(tripId)}>Xem trách nhiệm tại Quỹ nhóm →</Link>
              </aside>
            </div>
          )}
        </>
      )}
      <Drawer
        open={target !== null}
        label={target === 'self' ? 'Rời chuyến đi' : 'Xóa thành viên'}
        side="right"
        returnFocusRef={lifecycleReturnFocus}
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
    </div>
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
    <section className={styles.page} data-flow="gateway-members">
      <nav className={styles.breadcrumb} aria-label="Đường dẫn">
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <span>Thành viên</span>
      </nav>
      <h1 className={styles.visuallyHidden}>Thành viên</h1>
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
