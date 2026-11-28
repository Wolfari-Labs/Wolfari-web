import { useState, type ReactNode } from 'react';
import type { MembershipViewModel } from './model/members';
import styles from './MemberRoster.module.css';

function memberName(member: MembershipViewModel) {
  const shortId =
    member.userId.length > 16
      ? `${member.userId.slice(0, 8)}…${member.userId.slice(-4)}`
      : member.userId;
  return member.presentation.displayName ?? `User ${shortId}`;
}

function memberDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(value));
}

function MemberAvatar({ member, tone }: { member: MembershipViewModel; tone: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.avatar} data-tone={tone} aria-hidden="true">
      {member.presentation.avatar && !failed ? (
        <img
          src={member.presentation.avatar.src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        memberName(member).trim().charAt(0).toLocaleUpperCase('vi')
      )}
    </span>
  );
}

export function MemberRoster({
  members,
  currentUserId,
  timezone,
  canEditPlan,
  isFundHolder,
  renderActions,
}: {
  members: readonly MembershipViewModel[];
  currentUserId: string;
  timezone: string;
  canEditPlan?: (member: MembershipViewModel) => boolean;
  isFundHolder?: (member: MembershipViewModel) => boolean;
  renderActions?: (member: MembershipViewModel) => ReactNode;
}) {
  return (
    <div className={styles.roster}>
      <div className={styles.header} aria-hidden="true" data-region="member-roster-heading">
        <span>Thành viên</span>
        <span>Vai trò / Trách nhiệm</span>
        <span>Thao tác</span>
      </div>
      <ul
        className={styles.list}
        tabIndex={0}
        aria-label="Danh sách thành viên"
        data-region="member-roster-list"
      >
        {members.map((member, index) => (
          <li
            key={member.id}
            className={styles.row}
            data-member-id={member.id}
            data-departed={!!member.leftAt || undefined}
          >
            <div className={styles.identity}>
              <MemberAvatar
                key={member.presentation.avatar?.src ?? member.id}
                member={member}
                tone={index % 5}
              />
              <div className={styles.name}>
                <strong>{memberName(member)}</strong>
                <small>Tham gia {memberDate(member.joinedAt, timezone)}</small>
                {member.leftAt && <small>Đã rời {memberDate(member.leftAt, timezone)}</small>}
              </div>
            </div>
            <div className={styles.roles}>
              <span className={styles.badge} data-role={member.role}>
                {member.role === 'OWNER' && <span aria-hidden="true">★ </span>}
                {member.role === 'OWNER' ? 'Owner' : 'Member'}
              </span>
              {!member.leftAt && canEditPlan?.(member) && (
                <span className={styles.badge} data-role="editor">
                  Được sửa Plan
                </span>
              )}
              {!member.leftAt && isFundHolder?.(member) && (
                <span className={styles.badge} data-role="holder">
                  Fund Holder
                </span>
              )}
              {member.leftAt && (
                <span className={styles.badge} data-role="departed">
                  Đã rời
                </span>
              )}
            </div>
            <div className={styles.actions} data-region="member-actions">
              {member.userId === currentUserId ? (
                <span className={styles.self}>Bạn</span>
              ) : (
                (renderActions?.(member) ?? <span className={styles.empty}>—</span>)
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
