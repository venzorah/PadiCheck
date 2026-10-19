import { api } from './client';
import type { Investigation, InvestigationCreated, InvestigationDetail, InvestigationFinding, InvestigationInput, InvestigationSource } from '../types/investigation';

const pathFor = (id: string) => `/v1/investigations/${encodeURIComponent(id)}`;
export const investigationsApi = {
  create: (json: InvestigationInput, signal?: AbortSignal) => api<InvestigationCreated>('/v1/investigations', { method: 'POST', auth: true, json, signal }),
  list: (cursor?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ scope: 'own', limit: '20' });
    if (cursor) query.set('cursor', cursor);
    return api<{ investigations: Investigation[]; next_cursor: string | null }>(`/v1/investigations?${query}`, { auth: true, signal });
  },
  detail: (id: string, signal?: AbortSignal) => api<InvestigationDetail>(pathFor(id), { auth: true, signal }),
  sources: (id: string, offset = 0, signal?: AbortSignal) => api<{ sources: InvestigationSource[] }>(`${pathFor(id)}/sources?limit=20&offset=${offset}`, { auth: true, signal }),
  findings: (id: string, offset = 0, signal?: AbortSignal) => api<{ findings: InvestigationFinding[]; limitations: string[] }>(`${pathFor(id)}/findings?limit=20&offset=${offset}`, { auth: true, signal }),
  cancel: (id: string) => api<{ investigation: Investigation }>(`${pathFor(id)}/cancel`, { method: 'POST', auth: true }),
  retry: (id: string) => api<InvestigationCreated>(`${pathFor(id)}/retry`, { method: 'POST', auth: true }),
};
