import { api } from './client';
import type { InvestigationStatus, InvestigationType } from '../types/investigation';
export interface Bookmark {
    investigation_id: string;
    bookmarked_at: string;
    title: string | null;
    status: InvestigationStatus;
    investigation_type: InvestigationType;
}
export const bookmarksApi = {
    list: (offset = 0, signal?: AbortSignal) => api<{
        bookmarks: Bookmark[];
    }>(`/v1/me/bookmarks?limit=20&offset=${offset}`, { auth: true, signal }),
    add: (id: string) => api<{
        bookmarked: boolean;
    }>(`/v1/investigations/${encodeURIComponent(id)}/bookmark`, { auth: true, method: 'POST' }),
    remove: (id: string) => api<void>(`/v1/investigations/${encodeURIComponent(id)}/bookmark`, { auth: true, method: 'DELETE' }),
};
