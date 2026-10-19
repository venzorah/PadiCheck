import { api } from './client';
import type { MediaRecord } from '../types/investigation';

export const mediaApi = {
  upload: (file: File, signal?: AbortSignal) => api<{ media: MediaRecord }>('/v1/media', { method: 'POST', auth: true, file, signal }),
  delivery: (id: string, signal?: AbortSignal) => api<{ url: string; expires_at: number }>(`/v1/media/${encodeURIComponent(id)}/delivery`, { method: 'POST', auth: true, signal }),
  remove: (id: string) => api<void>(`/v1/media/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
};
