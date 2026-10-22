import { api } from './client';
export const notificationKinds = ['investigation.completed', 'investigation.failed', 'business.invitation'] as const;
export type NotificationKind = typeof notificationKinds[number];
export interface AppNotice {
    notification_id: string;
    notification_type: NotificationKind;
    related_id: string;
    read_at: string | null;
    created_at: string;
}
export const notificationsApi = {
    list: (offset = 0, signal?: AbortSignal, unread = false) => api<{
        notifications: AppNotice[];
    }>(`/v1/me/notifications?limit=20&offset=${offset}${unread ? '&unread_only=true' : ''}`, { auth: true, signal }),
    read: (id: string) => api<{
        notification: {
            notification_id: string;
            read_at: string;
        };
    }>(`/v1/me/notifications/${encodeURIComponent(id)}/read`, { auth: true, method: 'POST' }),
    preferences: (signal?: AbortSignal) => api<{
        preferences: {
            notification_type: NotificationKind;
            enabled: boolean;
        }[];
    }>('/v1/me/notification-preferences', { auth: true, signal }),
    setPreference: (notification_type: NotificationKind, enabled: boolean) => api('/v1/me/notification-preferences', { auth: true, method: 'PATCH', json: { notification_type, enabled } }),
};
