import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, useOutletContext } from 'react-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripRepository } from '../trips/repositories/repository-context';
import type { TripDetailViewModel } from '../trips/model/trip-detail';
import { TripHero } from '../trips/components/TripHero';
import { useMembersRepositories } from './repositories/members-context';
import {
  membershipScenarios,
  invitationScenarios,
  invitationEmailError,
  type MembershipScenario,
  type InvitationScenario,
  type MembershipPageViewModel,
  type InvitationPageViewModel,
} from './model/members';
import type { ReadResult } from '../../shared/types/result';
import type { DomainError } from '../../shared/types/result';
import type { PlanEditPolicy, UpdatePlanPolicyResult } from '../trips/repositories/trip.repository';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { Icon } from '../../shared/components/Icon';
import styles from './MembersPage.module.css';
import { InvitationManagement } from './InvitationManagement';
import { GatewayMembersPage } from './GatewayMembersPage';
import { MemberRoleHelp } from './MemberRoleHelp';
import { MemberRoster } from './MemberRoster';
type Snapshot<T> = ReadResult<T> | { status: 'loading' };
function ReadPanel<T>({
  result,
  onRetry,
  children,
}: {
  result: Snapshot<T>;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}) {
  return result.status === 'loading' ? (
    <ContentState state="loading" headingLevel={2} />
  ) : result.status === 'error' ? (
    <ContentState
      state={
        result.error.code === 'SERVICE_UNAVAILABLE' && !result.error.retryable
          ? 'unavailable'
          : 'error'
      }
      error={result.error}
      headingLevel={2}
      onRetry={onRetry}
    />
  ) : result.status === 'empty' ? (
    <ContentState state="empty" headingLevel={2} />
  ) : (
    children(result.data)
  );
}
function date(value: string, timezone: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: timezone }).format(
    new Date(value),
  );
}
type PolicyFeedback =
  | { readonly status: 'saved' }
  | { readonly status: 'error' | 'conflict' | 'unknown'; readonly error: DomainError };

function PlanPolicyPanel({
  trip,
  available,
  policy,
  pending,
  retryingUnknown,
  feedback,
  onChange,
  onSubmit,
}: {
  trip: TripDetailViewModel;
  available: boolean;
  policy: PlanEditPolicy;
  pending: boolean;
  retryingUnknown: boolean;
  feedback: PolicyFeedback | null;
  onChange: (policy: PlanEditPolicy) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className={styles.policyPanel} aria-labelledby="plan-policy-heading">
      <div className={styles.cardHeader}>
        <span className={styles.iconBadge} data-tone="blue" aria-hidden="true">
          <Icon name="edit" size={22} />
        </span>
        <div>
          <h2 id="plan-policy-heading">Quyền sửa lịch trình</h2>
          <p>
            Quyền này độc lập với vai trò thành viên và trách nhiệm quản lý quỹ. Thay đổi có hiệu
            lực sau khi xác nhận lại dữ liệu từ chuyến đi.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        {feedback?.status === 'saved' && (
          <Alert tone="success" live>
            Đã xác nhận quyền mới từ dữ liệu chuyến đi.
          </Alert>
        )}
        {feedback && feedback.status !== 'saved' && (
          <Alert tone={feedback.status === 'conflict' ? 'warning' : 'error'} live>
            {feedback.status === 'conflict'
              ? 'Quyền chuyến đi đã thay đổi. Dữ liệu mới đã được tải lại; kiểm tra lựa chọn rồi lưu lại.'
              : feedback.status === 'unknown'
                ? 'Chưa xác định được kết quả. Giữ nguyên yêu cầu; thử lại sẽ dùng cùng nội dung và mã yêu cầu.'
                : 'Không thể cập nhật quyền sửa lịch trình. Bản chọn hiện tại vẫn được giữ.'}
            {feedback.error.correlationId && (
              <details>
                <summary>Chi tiết hỗ trợ</summary>
                <small>Mã tra cứu: {feedback.error.correlationId}</small>
              </details>
            )}
          </Alert>
        )}
        <Select
          label="Ai có thể sửa lịch trình"
          value={policy}
          disabled={!available || pending || retryingUnknown}
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'OWNER_ONLY' || value === 'ALL_MEMBERS' || value === 'SELECTED_MEMBERS')
              onChange(value);
          }}
        >
          <option value="OWNER_ONLY">Chỉ chủ chuyến</option>
          <option value="ALL_MEMBERS">Mọi thành viên đang hoạt động</option>
          <option value="SELECTED_MEMBERS" disabled>
            {trip.planEditPolicy === 'SELECTED_MEMBERS'
              ? 'Đang áp dụng: thành viên được chọn · chưa thể chỉnh sửa'
              : 'Thành viên được chọn · chưa khả dụng'}
          </option>
        </Select>
        {!available && (
          <Alert>
            {trip.archivedAt || trip.lifecycle === 'ARCHIVED'
              ? 'Chuyến đi đã lưu trữ; không thể thay đổi quyền.'
              : 'Chỉ chủ chuyến mới có thể thay đổi quyền.'}
          </Alert>
        )}
        {trip.planEditPolicy === 'SELECTED_MEMBERS' && (
          <Alert tone="warning">
            Chưa thể xem hoặc chỉnh sửa danh sách thành viên được chọn. Bạn vẫn có thể chuyển sang
            một trong hai chế độ trên.
          </Alert>
        )}
        <Button
          type="submit"
          className={styles.policySubmit}
          icon={<Icon name="check" size={16} />}
          loading={pending}
          disabled={
            !available ||
            pending ||
            (!retryingUnknown && feedback?.status !== 'conflict' && policy === trip.planEditPolicy)
          }
        >
          {retryingUnknown ? 'Thử lại cùng yêu cầu' : pending ? 'Đang lưu' : 'Lưu quyền'}
        </Button>
      </form>
    </section>
  );
}
const invitationLabels = {
  PENDING: 'Đang chờ phản hồi',
  ACCEPTED: 'Đã sử dụng',
  DECLINED: 'Đã từ chối',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Đã hết hạn',
};
export function MembersView({
  trip,
  members,
  invitations,
  tab,
  onTabChange,
  onRetryMembers,
  onRetryNextMembersPage,
  onLoadMoreMembers,
  loadingNextMembersPage,
  nextMembersPageError,
  includeLeft,
  onIncludeLeftChange,
  onRetryInvitations,
  policyAvailable,
  policyDraft,
  policyPending,
  retryingUnknownPolicy,
  policyFeedback,
  onPolicyChange,
  onSubmitPolicy,
  draft,
  onDraftChange,
  invitationManagement,
}: {
  invitationManagement?: ReactNode;
  trip: TripDetailViewModel;
  members: Snapshot<MembershipPageViewModel>;
  invitations: Snapshot<InvitationPageViewModel>;
  tab: 'members' | 'invitations' | 'policy';
  onTabChange: (tab: 'members' | 'invitations' | 'policy') => void;
  onRetryMembers: () => void;
  onRetryNextMembersPage: () => void;
  onLoadMoreMembers: () => void;
  loadingNextMembersPage: boolean;
  nextMembersPageError: boolean;
  includeLeft: boolean;
  onIncludeLeftChange: (includeLeft: boolean) => void;
  onRetryInvitations: () => void;
  policyAvailable: boolean;
  policyDraft: PlanEditPolicy;
  policyPending: boolean;
  retryingUnknownPolicy: boolean;
  policyFeedback: PolicyFeedback | null;
  onPolicyChange: (policy: PlanEditPolicy) => void;
  onSubmitPolicy: (event: FormEvent) => void;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const owner = trip.currentMembership.role === 'OWNER';
  const [emailError, setEmailError] = useState<string | undefined>(),
    [notice, setNotice] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const error = invitationEmailError(draft);
    setEmailError(error);
    if (error) document.getElementById('invitation-email')?.focus();
    else setNotice(true);
  };
  return (
    <>
      <div className={styles.hero}>
        <TripHero trip={trip} compact variant="landscape" />
      </div>
      <div className={styles.top}>
        <div className={styles.tabs} role="group" aria-label="Nội dung thành viên">
          <button
            type="button"
            aria-pressed={tab === 'members'}
            onClick={() => onTabChange('members')}
          >
            Thành viên
          </button>
          <button
            type="button"
            aria-pressed={tab === 'invitations'}
            disabled={!owner}
            title={!owner ? 'Chỉ chủ chuyến được xem lời mời' : undefined}
            onClick={() => onTabChange('invitations')}
          >
            Lời mời
          </button>
          <button
            type="button"
            aria-pressed={tab === 'policy'}
            disabled={!policyAvailable}
            title={
              !policyAvailable ? 'Chỉ chủ chuyến có quyền cập nhật mới thay đổi được' : undefined
            }
            onClick={() => onTabChange('policy')}
          >
            Quyền sửa lịch trình
          </button>
        </div>
      </div>
      {tab === 'policy' ? (
        <PlanPolicyPanel
          trip={trip}
          available={policyAvailable}
          policy={policyDraft}
          pending={policyPending}
          retryingUnknown={retryingUnknownPolicy}
          feedback={policyFeedback}
          onChange={onPolicyChange}
          onSubmit={onSubmitPolicy}
        />
      ) : tab === 'members' ? (
        <div className={styles.workspace}>
          <section className={styles.memberPanel} aria-label="Danh sách thành viên">
            <div className={styles.panelHeading}>
              <div className={styles.panelTitle}>
                <h2>Thành viên chuyến đi</h2>
                <MemberRoleHelp />
              </div>
              {owner && (
                <Button
                  className={styles.inviteButton}
                  icon={<Icon name="userPlus" size={17} />}
                  onClick={() => onTabChange('invitations')}
                >
                  Mời thành viên
                </Button>
              )}
            </div>
            <label className={styles.includeLeft}>
              <input
                type="checkbox"
                checked={includeLeft}
                onChange={(event) => onIncludeLeftChange(event.target.checked)}
              />
              <span>Hiển thị người đã rời</span>
            </label>
            <ReadPanel result={members} onRetry={onRetryMembers}>
              {(data) => {
                const items = data.items.filter(
                  (member) => member.tripId === trip.id && (includeLeft || member.leftAt === null),
                );
                return items.length || data.nextCursor ? (
                  <>
                    <p className={styles.count}>{items.length} thành viên đã tải</p>
                    <MemberRoster
                      members={items}
                      currentUserId={trip.currentMembership.userId}
                      timezone={trip.timezone}
                      canEditPlan={(member) =>
                        trip.archivedAt === null &&
                        trip.lifecycle !== 'ARCHIVED' &&
                        (member.role === 'OWNER' || trip.planEditPolicy === 'ALL_MEMBERS')
                      }
                    />
                    {nextMembersPageError && (
                      <Alert tone="warning" live>
                        Chưa tải được trang tiếp theo. Các thành viên đã tải vẫn được giữ.
                        <Button variant="outline" onClick={onRetryNextMembersPage}>
                          Thử lại trang này
                        </Button>
                      </Alert>
                    )}
                    {data.nextCursor && (
                      <Button
                        variant="outline"
                        loading={loadingNextMembersPage}
                        disabled={loadingNextMembersPage}
                        onClick={onLoadMoreMembers}
                      >
                        Tải thêm thành viên
                      </Button>
                    )}
                  </>
                ) : (
                  <ContentState state="empty" headingLevel={2} />
                );
              }}
            </ReadPanel>
          </section>
        </div>
      ) : !owner ? (
        <ContentState
          state="error"
          headingLevel={2}
          error={{ code: 'PERMISSION_DENIED', correlationId: null, retryable: false }}
        />
      ) : invitationManagement ? null : (
        <div className={styles.invitationWorkspace}>
          <form
            className={styles.invitationForm}
            noValidate
            onSubmit={submit}
            aria-label="Mời thành viên"
          >
            <div className={styles.cardHeader}>
              <span className={styles.iconBadge} data-tone="blue" aria-hidden="true">
                <Icon name="userPlus" size={22} />
              </span>
              <div>
                <h2>Mời thành viên</h2>
                <p>
                  Người nhận tham gia chuyến đi sau khi chấp nhận. Quyền sửa lịch trình và trách
                  nhiệm quỹ không tự đi kèm.
                </p>
              </div>
            </div>
            <div className={styles.inviteRow}>
              <Input
                id="invitation-email"
                label="Email người nhận"
                type="email"
                autoComplete="off"
                leadingIcon={
                  <span className={styles.fieldChip}>
                    <Icon name="mail" size={18} />
                  </span>
                }
                value={draft}
                error={emailError}
                onChange={(e) => {
                  onDraftChange(e.target.value);
                  setEmailError(undefined);
                  setNotice(false);
                }}
              />
              <Button type="submit" icon={<Icon name="share" size={16} />}>
                Kiểm tra lời mời
              </Button>
            </div>
            {notice && (
              <Alert live>
                Email hợp lệ cho bản xem trước. Chưa gửi lời mời, tạo link hoặc thay đổi thành viên.
              </Alert>
            )}
          </form>
          <section className={styles.invitationList} aria-label="Lời mời hiện có">
            <div className={styles.cardHeader}>
              <span className={styles.iconBadge} data-tone="amber" aria-hidden="true">
                <Icon name="clock" size={22} />
              </span>
              <h2>Lời mời</h2>
            </div>
            <ReadPanel result={invitations} onRetry={onRetryInvitations}>
              {(data) =>
                data.items.length ? (
                  <>
                    <ul>
                      {data.items
                        .filter((i) => i.tripId === trip.id)
                        .map((invitation) => (
                          <li key={invitation.id}>
                            <span className={styles.invitationAvatar} aria-hidden="true">
                              {invitation.invitationType === 'EMAIL' && invitation.email ? (
                                invitation.email.charAt(0).toLocaleUpperCase('vi')
                              ) : (
                                <Icon name="share" size={16} />
                              )}
                            </span>
                            <div className={styles.invitationBody}>
                              <div className={styles.invitationHeading}>
                                <strong>
                                  {invitation.invitationType === 'EMAIL'
                                    ? (invitation.email ?? 'Chưa có email')
                                    : 'Lời mời bằng link'}
                                </strong>
                                <span
                                  className={styles.invitationStatus}
                                  data-status={invitation.status}
                                >
                                  {invitationLabels[invitation.status]}
                                </span>
                              </div>
                              <p>Hết hạn {date(invitation.expiresAt, trip.timezone)}</p>
                              {invitation.resolvedAt && (
                                <p>Kết thúc {date(invitation.resolvedAt, trip.timezone)}</p>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                    {data.nextCursor && (
                      <Alert>Danh sách còn trang khác; chưa hiển thị toàn bộ lời mời.</Alert>
                    )}
                  </>
                ) : (
                  <ContentState state="empty" headingLevel={2} />
                )
              }
            </ReadPanel>
            <p className={styles.terminalNote}>
              Lời mời đã chấp nhận, từ chối, hết hạn hoặc thu hồi không dùng lại được.
            </p>
          </section>
        </div>
      )}
      {invitationManagement && (
        <div className={styles.invitationManagement} hidden={tab !== 'invitations'}>
          {invitationManagement}
        </div>
      )}
    </>
  );
}
export function MembersPage() {
  const { membership } = useMembersRepositories();
  return membership.commands ? (
    <GatewayMembersPage commands={membership.commands} />
  ) : (
    <PreviewMembersPage />
  );
}
function PreviewMembersPage() {
  const { tripId = '' } = useParams(),
    { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository(),
    { membership, invitation } = useMembersRepositories();
  const queryClient = useQueryClient();
  const [scenario, setScenario] = useState<MembershipScenario>('success'),
    [invitationScenario, setInvitationScenario] = useState<InvitationScenario>('success'),
    [tab, setTab] = useState<'members' | 'invitations' | 'policy'>('members'),
    [includeLeft, setIncludeLeft] = useState(false),
    [draft, setDraft] = useState(''),
    [commandState, setCommandState] = useState('idle'),
    [policyDraft, setPolicyDraft] = useState<PlanEditPolicy>('OWNER_ONLY'),
    [policyPending, setPolicyPending] = useState(false),
    [policyFeedback, setPolicyFeedback] = useState<PolicyFeedback | null>(null);
  const policyAttempt = useRef<{
    readonly policy: PlanEditPolicy;
    readonly expectedMembershipRevision: number;
    readonly idempotencyKey: string;
  } | null>(null);
  const policyController = useRef<AbortController | null>(null);
  const initializedPolicyTrip = useRef<string | null>(null);
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  useEffect(() => {
    if (!trip || initializedPolicyTrip.current === tripId) return;
    initializedPolicyTrip.current = tripId;
    setPolicyDraft(trip.planEditPolicy);
    setPolicyFeedback(null);
    policyAttempt.current = null;
  }, [trip, tripId]);
  useEffect(() => () => policyController.current?.abort(), []);
  const allowed =
    !!trip?.permissions.canRead &&
    trip.id === tripId &&
    trip.currentMembership.leftAt === null &&
    trip.currentMembership.tripId === tripId;
  const membersQuery = useInfiniteQuery({
    queryKey: ['members', tripId, scenario, includeLeft],
    initialPageParam: null as string | null,
    queryFn: async ({ signal, pageParam }) => {
      const result = await membership.listMembers({
        tripId,
        scenario,
        signal,
        limit: 100,
        includeLeft,
        ...(pageParam === null ? {} : { cursor: pageParam }),
      });
      if (result.status === 'error') throw result.error;
      return result.status === 'empty' ? { items: [], nextCursor: null } : result.data;
    },
    getNextPageParam: (lastPage, _pages, _lastPageParam, pageParams) => {
      const cursor = lastPage.nextCursor;
      return cursor && !pageParams.includes(cursor) ? cursor : undefined;
    },
    retry: false,
    enabled: allowed,
  });
  const owner = allowed && trip?.currentMembership.role === 'OWNER';
  const policyAvailable =
    !previewEnabled &&
    !!tripRepository.updatePlanPolicy &&
    owner &&
    trip?.permissions.canUpdate === true &&
    trip.archivedAt === null &&
    trip.lifecycle !== 'ARCHIVED';
  const invitationsQuery = useQuery({
    queryKey: ['invitations', tripId, invitationScenario],
    queryFn: ({ signal }) =>
      invitation.listInvitations({ tripId, scenario: invitationScenario, signal }),
    enabled: owner && tab === 'invitations' && (previewEnabled || !invitation.createInvitation),
  });
  const memberPages = membersQuery.data?.pages ?? [];
  const uniqueMembers = new Map(
    memberPages.flatMap((page) => page.items).map((member) => [member.id, member]),
  );
  const lastMemberPage = memberPages.at(-1);
  const members: Snapshot<MembershipPageViewModel> = membersQuery.isPending
    ? { status: 'loading' }
    : membersQuery.isError && memberPages.length === 0
      ? {
          status: 'error',
          error:
            typeof membersQuery.error === 'object' &&
            membersQuery.error !== null &&
            'code' in membersQuery.error
              ? (membersQuery.error as unknown as DomainError)
              : { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : memberPages.length > 0
        ? {
            status: 'ready',
            data: {
              items: Array.from(uniqueMembers.values()),
              nextCursor: lastMemberPage?.nextCursor ?? null,
            },
          }
        : { status: 'empty' };
  const invitations: Snapshot<InvitationPageViewModel> = invitationsQuery.isPending
    ? { status: 'loading' }
    : invitationsQuery.isError
      ? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : (invitationsQuery.data ?? { status: 'empty' });
  const error = tripQuery.isError
    ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
    : tripQuery.data?.status === 'error'
      ? tripQuery.data.error
      : trip && !allowed
        ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
        : null;

  async function refreshPolicyProjections() {
    await Promise.all([
      queryClient.resetQueries({ queryKey: ['plan', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['trip', 'detail', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['members', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['shell', tripId] }),
      queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
    ]);
  }

  async function submitPolicy(event: FormEvent) {
    event.preventDefault();
    if (!policyAvailable || !trip || policyPending || !tripRepository.updatePlanPolicy) return;
    let intent = policyAttempt.current;
    if (!intent) {
      if (policyDraft === trip.planEditPolicy && policyFeedback?.status !== 'conflict') return;
      intent = {
        policy: policyDraft,
        expectedMembershipRevision: trip.membershipRevision,
        idempotencyKey:
          globalThis.crypto?.randomUUID?.() ??
          `plan-policy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      policyAttempt.current = intent;
    }
    setPolicyFeedback(null);
    setPolicyPending(true);
    const controller = new AbortController();
    policyController.current = controller;
    let result: UpdatePlanPolicyResult;
    try {
      result = await tripRepository.updatePlanPolicy({
        tripId,
        policy: intent.policy,
        editorMemberIds: [],
        expectedMembershipRevision: intent.expectedMembershipRevision,
        idempotencyKey: intent.idempotencyKey,
        signal: controller.signal,
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      result = {
        status: 'unknown',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          correlationId: null,
          retryable: true,
          details: cause,
        },
      };
    }
    if (controller.signal.aborted) return;

    const refreshAuthority = async () => {
      try {
        await refreshPolicyProjections();
      } catch {
        // Keep the command outcome visible when a follow-up read also fails.
      }
    };

    if (result.status === 'updated' || result.status === 'unknown') {
      await refreshAuthority();
      if (controller.signal.aborted) return;
      const fresh = queryClient.getQueryData<ReadResult<TripDetailViewModel>>([
        'trip',
        'detail',
        tripId,
        'success',
      ]);
      const minimumRevision =
        result.status === 'updated'
          ? result.data.membershipRevision
          : intent.expectedMembershipRevision;
      if (
        result.status === 'updated' &&
        fresh?.status === 'ready' &&
        fresh.data.planEditPolicy === intent.policy &&
        fresh.data.membershipRevision >= minimumRevision
      ) {
        policyAttempt.current = null;
        setPolicyDraft(fresh.data.planEditPolicy);
        setPolicyFeedback({ status: 'saved' });
      } else {
        policyAttempt.current = intent;
        setPolicyFeedback({
          status: 'unknown',
          error:
            result.status === 'unknown'
              ? result.error
              : {
                  code: 'SERVICE_UNAVAILABLE',
                  correlationId: result.status === 'updated' ? result.correlationId : null,
                  retryable: true,
                },
        });
      }
      setPolicyPending(false);
      return;
    }

    if (
      result.error.code === 'STATE_CONFLICT' ||
      result.error.code === 'VERSION_CONFLICT' ||
      result.error.code === 'PERMISSION_DENIED' ||
      result.error.code === 'RESOURCE_NOT_FOUND'
    ) {
      policyAttempt.current = null;
      await refreshAuthority();
    } else {
      policyAttempt.current = null;
    }
    if (controller.signal.aborted) return;
    setPolicyFeedback({
      status:
        result.error.code === 'STATE_CONFLICT' || result.error.code === 'VERSION_CONFLICT'
          ? 'conflict'
          : 'error',
      error: result.error,
    });
    setPolicyPending(false);
  }
  return (
    <section className={styles.page} data-flow="members-preview" data-node-id="25:360">
      <PageBreadcrumb
        className={styles.breadcrumb}
        items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
        current="Thành viên"
      />
      {error ? (
        <ContentState
          state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
          error={error}
          headingLevel={2}
          onRetry={() => {
            void tripQuery.refetch();
          }}
        />
      ) : tripQuery.isPending ? (
        <ContentState state="loading" headingLevel={2} />
      ) : trip ? (
        <MembersView
          invitationManagement={
            !previewEnabled && invitation.createInvitation ? (
              <InvitationManagement
                key={`${trip.id}:${trip.currentMembership.id}`}
                trip={trip}
                active={tab === 'invitations'}
              />
            ) : undefined
          }
          trip={trip}
          members={members}
          invitations={invitations}
          tab={tab}
          onTabChange={setTab}
          onRetryMembers={() => {
            if (allowed) void membersQuery.refetch();
          }}
          onRetryNextMembersPage={() => {
            if (allowed) void membersQuery.fetchNextPage();
          }}
          onLoadMoreMembers={() => {
            if (allowed && membersQuery.hasNextPage && !membersQuery.isFetchingNextPage)
              void membersQuery.fetchNextPage();
          }}
          loadingNextMembersPage={membersQuery.isFetchingNextPage}
          nextMembersPageError={membersQuery.isFetchNextPageError}
          includeLeft={includeLeft}
          onIncludeLeftChange={setIncludeLeft}
          onRetryInvitations={() => {
            if (owner) void invitationsQuery.refetch();
          }}
          policyAvailable={policyAvailable}
          policyDraft={policyDraft}
          policyPending={policyPending}
          retryingUnknownPolicy={policyFeedback?.status === 'unknown'}
          policyFeedback={policyFeedback}
          onPolicyChange={(next) => {
            setPolicyDraft(next);
            setPolicyFeedback(null);
          }}
          onSubmitPolicy={(event) => void submitPolicy(event)}
          draft={draft}
          onDraftChange={setDraft}
        />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details className="preview" data-preview="members">
          <summary>Members preview · Dữ liệu minh họa</summary>
          {trip && (
            <p className={styles.revisions}>
              Membership revision {trip.membershipRevision} · Plan {trip.planVersion} · Export{' '}
              {trip.exportRevision} · {owner ? 'Owner' : 'Member'}
            </p>
          )}
          <Select
            label="Trạng thái thành viên"
            value={scenario}
            onChange={(e) => {
              const next = membershipScenarios.find((s) => s === e.target.value);
              if (next) setScenario(next);
            }}
          >
            {membershipScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái lời mời"
            value={invitationScenario}
            onChange={(e) => {
              const next = invitationScenarios.find((s) => s === e.target.value);
              if (next) setInvitationScenario(next);
            }}
          >
            {invitationScenarios.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Trạng thái thao tác preview"
            value={commandState}
            onChange={(e) => setCommandState(e.target.value)}
          >
            {['idle', 'pending', 'unknown'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          {commandState !== 'idle' && (
            <Alert live>
              {commandState === 'pending'
                ? 'Minh họa đang xử lý · Không có request đang gửi.'
                : 'Minh họa chưa xác định · Chưa xác nhận gửi lời mời hoặc thay đổi membership.'}
            </Alert>
          )}
        </details>
      )}
    </section>
  );
}
