import { api } from './client';
export type KeyScope = 'investigations:read' | 'investigations:create';
export interface ApiKeyRecord {
    api_key_id: string;
    name: string;
    key_prefix: string;
    scopes: KeyScope[];
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
    last_used_at: string | null;
}
export interface ApiKeyCreated {
    api_key: ApiKeyRecord;
    secret: string;
}
export const apiKeysApi = {
    create: (name: string, scopes: KeyScope[], expires_in_days: number) => api<ApiKeyCreated>('/v1/me/api-keys', { auth: true, method: 'POST', json: { name, scopes, expires_in_days } }),
    rotate: (id: string) => api<ApiKeyCreated>(`/v1/me/api-keys/${encodeURIComponent(id)}/rotate`, { auth: true, method: 'POST' }),
    revoke: (id: string) => api<void>(`/v1/me/api-keys/${encodeURIComponent(id)}`, { auth: true, method: 'DELETE' }),
};
