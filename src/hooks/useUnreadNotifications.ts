import type { AppNotice } from '../api/notifications';
import { useApiData } from './useApiData';
export function useUnreadNotifications(): boolean {
    const state = useApiData<{
        notifications: AppNotice[];
    }>('/v1/me/notifications?unread_only=true&limit=1&offset=0');
    // Only an unread indicator: the API has no total-unread counter.
    return Boolean(state.data?.notifications.length);
}
