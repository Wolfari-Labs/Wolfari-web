import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useOutletContext } from 'react-router';
import { useQuery } from '@tanstack/react-query';
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
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import userIcon from '../../shared/assets/figma/2e748.svg';
import styles from './MembersPage.module.css';
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
  onRetryInvitations,
  draft,
  onDraftChange,
}: {
  trip: TripDetailViewModel;
  members: Snapshot<MembershipPageViewModel>;
  invitations: Snapshot<InvitationPageViewModel>;
  tab: 'members' | 'invitations';
  onTabChange: (tab: 'members' | 'invitations') => void;
  onRetryMembers: () => void;
  onRetryInvitations: () => void;
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
          title={!owner ? 'Chỉ Owner được đọc lời mời' : undefined}
          onClick={() => onTabChange('invitations')}
        >
          Lời mời · Xem trước
        </button>
        <Button variant="plain" disabled>
          Quyền sửa lịch trình
        </Button>
        <small>Vai trò và trách nhiệm được quản lý riêng.</small>
      </div>
      {tab === 'members' ? (
        <div className={styles.workspace}>
          <section className={styles.memberPanel} aria-label="Danh sách thành viên">
            <h2>Thành viên chuyến đi</h2>
            <p className={styles.help}>
              Vai trò trong chuyến đi và trách nhiệm riêng được hiển thị tách biệt.
            </p>
            <ReadPanel result={members} onRetry={onRetryMembers}>
              {(data) => {
                const items = data.items.filter((m) => m.tripId === trip.id && m.leftAt === null);
                return items.length ? (
                  <>
                    <p className={styles.count}>{items.length} thành viên trong trang này</p>
                    <div className={styles.rosterHead} aria-hidden="true">
                      <span>Thành viên</span>
                      <span>Vai trò / Trách nhiệm</span>
                      <span>Thao tác</span>
                    </div>
                    <ul className={styles.members}>
                      {items.map((member, index) => (
                        <li key={member.id}>
                          <span className={styles.avatar}>
                            {member.presentation.avatar ? (
                              <img
                                className={styles.avatarPhoto}
                                src={member.presentation.avatar.src}
                                alt={member.presentation.avatar.alt}
                              />
                            ) : (
                              <img src={userIcon} alt="" />
                            )}
                          </span>
                          <div className={styles.identity}>
                            <strong>
                              {member.presentation.displayName ?? `Thành viên ${index + 1}`}
                            </strong>
                            <small>Tham gia {date(member.joinedAt, trip.timezone)}</small>
                          </div>
                          <span
                            className={`${styles.role} ${member.role === 'OWNER' ? styles.owner : ''}`}
                          >
                            {member.role === 'OWNER' ? 'Chủ chuyến' : 'Thành viên'}
                          </span>
                          {owner && member.role === 'MEMBER' && (
                            <Button variant="outline" disabled>
                              Chuyển Owner
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {data.nextCursor && (
                      <Alert>Danh sách còn trang khác; chưa hiển thị toàn bộ thành viên.</Alert>
                    )}
                  </>
                ) : (
                  <ContentState state="empty" headingLevel={2} />
                );
              }}
            </ReadPanel>
            <Alert tone="warning">
              Rời hoặc xóa thành viên cần kiểm tra nghĩa vụ và trách nhiệm liên quan. Thao tác hiện
              chưa khả dụng.
            </Alert>
            <div className={styles.lifecycle}>
              <Button variant="outline" disabled>
                Rời chuyến đi
              </Button>
              <Button variant="outline" disabled>
                Xóa thành viên
              </Button>
            </div>
          </section>
          <aside className={styles.responsibilities}>
            <h2>Quyền & trách nhiệm</h2>
            <section>
              <h3>Chủ chuyến</h3>
              <p>Quản lý thành viên, lời mời và quyền sửa lịch trình.</p>
            </section>
            <section>
              <h3>Người giữ quỹ</h3>
              <p>
                Trách nhiệm quản lý quỹ tách biệt với vai trò trong chuyến đi. Thông tin người quản
                lý quỹ chưa khả dụng.
              </p>
            </section>
            <section>
              <h3>Quyền sửa lịch trình</h3>
              <p>
                {trip.planEditPolicy === 'OWNER_ONLY'
                  ? 'Chỉ chủ chuyến được sửa lịch trình.'
                  : trip.planEditPolicy === 'SELECTED_MEMBERS'
                    ? 'Chủ chuyến và thành viên được phân công có thể sửa lịch trình.'
                    : 'Mọi thành viên được sửa lịch trình.'}
              </p>
              <p>Quyền sửa lịch trình được quản lý riêng với quyền quản lý quỹ và thành viên.</p>
            </section>
            <section>
              <h3>Khi chuyển chủ chuyến</h3>
              <p>
                Thay đổi chủ chuyến vẫn giữ riêng trách nhiệm người giữ quỹ và quyền sửa lịch trình.
              </p>
            </section>
            <Button variant="outline" disabled>
              Quản lý người giữ quỹ
            </Button>
          </aside>
        </div>
      ) : !owner ? (
        <ContentState
          state="error"
          headingLevel={2}
          error={{ code: 'PERMISSION_DENIED', correlationId: null, retryable: false }}
        />
      ) : (
        <div className={styles.invitationWorkspace}>
          <form
            className={styles.invitationForm}
            noValidate
            onSubmit={submit}
            aria-label="Xem trước lời mời"
          >
            <h2>Mời thành viên</h2>
            <p>Người nhận tham gia với vai trò Member sau khi chấp nhận lời mời hợp lệ.</p>
            <Input
              id="invitation-email"
              label="Email người nhận"
              type="email"
              autoComplete="off"
              value={draft}
              error={emailError}
              onChange={(e) => {
                onDraftChange(e.target.value);
                setEmailError(undefined);
                setNotice(false);
              }}
            />
            <Button type="submit">Kiểm tra lời mời</Button>
            {notice && (
              <Alert live>
                Email hợp lệ cho bản xem trước. Chưa gửi lời mời, tạo link hoặc thay đổi thành viên.
              </Alert>
            )}
            <Alert>Chỉ xem trước · Gửi lời mời, gửi lại và thu hồi chưa khả dụng.</Alert>
            <Alert tone="warning">
              Quyền sửa Plan và trách nhiệm quản lý quỹ được phân công riêng, không tự cấp khi mời
              thành viên.
            </Alert>
          </form>
          <section className={styles.invitationList} aria-label="Lời mời hiện có">
            <h2>Lời mời</h2>
            <ReadPanel result={invitations} onRetry={onRetryInvitations}>
              {(data) =>
                data.items.length ? (
                  <>
                    <ul>
                      {data.items
                        .filter((i) => i.tripId === trip.id)
                        .map((invitation) => (
                          <li key={invitation.id}>
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
                            <div className={styles.lifecycle}>
                              <Button variant="outline" disabled>
                                Gửi lại
                              </Button>
                              <Button variant="plain" disabled>
                                Thu hồi
                              </Button>
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
            <Alert tone="warning">
              Lời mời đã chấp nhận, từ chối, hết hạn hoặc thu hồi không thể dùng để tạo lại thành
              viên.
            </Alert>
          </section>
        </div>
      )}
    </>
  );
}
export function MembersPage() {
  const { tripId = '' } = useParams(),
    { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository(),
    { membership, invitation } = useMembersRepositories();
  const [scenario, setScenario] = useState<MembershipScenario>('success'),
    [invitationScenario, setInvitationScenario] = useState<InvitationScenario>('success'),
    [tab, setTab] = useState<'members' | 'invitations'>('members'),
    [draft, setDraft] = useState(''),
    [commandState, setCommandState] = useState('idle');
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed =
    !!trip?.permissions.canRead &&
    trip.id === tripId &&
    trip.currentMembership.leftAt === null &&
    trip.currentMembership.tripId === tripId;
  const membersQuery = useQuery({
    queryKey: ['members', tripId, scenario],
    queryFn: ({ signal }) => membership.listMembers({ tripId, scenario, signal }),
    enabled: allowed,
  });
  const owner = allowed && trip?.currentMembership.role === 'OWNER';
  const invitationsQuery = useQuery({
    queryKey: ['invitations', tripId, invitationScenario],
    queryFn: ({ signal }) =>
      invitation.listInvitations({ tripId, scenario: invitationScenario, signal }),
    enabled: owner && tab === 'invitations',
  });
  const members: Snapshot<MembershipPageViewModel> = membersQuery.isPending
    ? { status: 'loading' }
    : membersQuery.isError
      ? {
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
        }
      : (membersQuery.data ?? { status: 'empty' });
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
  return (
    <section className={styles.page} data-flow="members-preview" data-node-id="25:360">
      <div className={styles.breadcrumb}>
        <Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link>
        <span aria-hidden="true">›</span>
        <h1>Thành viên</h1>
      </div>
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
          trip={trip}
          members={members}
          invitations={invitations}
          tab={tab}
          onTabChange={setTab}
          onRetryMembers={() => {
            if (allowed) void membersQuery.refetch();
          }}
          onRetryInvitations={() => {
            if (owner) void invitationsQuery.refetch();
          }}
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
