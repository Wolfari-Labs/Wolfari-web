export const notificationGroups = [
  'INVITATION',
  'PLAN',
  'PACKING',
  'CONTRIBUTION',
  'CLOSURE',
  'PRICE',
] as const;
export type NotificationGroup = (typeof notificationGroups)[number];
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  tripId: string | null;
  sourceId: string | null;
  createdAt: string;
  readAt: string | null;
}
export interface Preferences {
  push_enabled: boolean;
  email_enabled: boolean;
  group_overrides: Partial<Record<NotificationGroup, { push?: boolean; email?: boolean }>>;
  version: number;
}
