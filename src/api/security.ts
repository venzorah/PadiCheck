import { api } from './client';
export interface SessionRecord {
    session_id: string;
    authenticated_at: string;
    expires_at: string;
    is_current: boolean;
}
export interface RecoveryResult {
    recovery_codes?: string[];
    sign_in_required: boolean;
    enabled?: boolean;
}
export const securityApi = {
    sessions: (signal?: AbortSignal) => api<{
        sessions: SessionRecord[];
    }>('/v1/auth/sessions', { auth: true, signal }),
    revoke: (id: string) => api<void>(`/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
    logoutAll: () => api<void>('/v1/auth/logout-all', { method: 'POST', auth: true }),
    status: (signal?: AbortSignal) => api<{
        enabled: boolean;
        recovery_codes_remaining: number;
    }>('/v1/auth/mfa', { auth: true, signal }),
    setup: () => api<{
        secret: string;
        otpauth_uri: string;
        expires_in: number;
    }>('/v1/auth/mfa/setup', { method: 'POST', auth: true }),
    confirm: (code: string) => api<RecoveryResult>('/v1/auth/mfa/confirm', { method: 'POST', auth: true, json: { code } }),
    disable: (code: string) => api<RecoveryResult>('/v1/auth/mfa/disable', { method: 'POST', auth: true, json: { code } }),
    regenerate: (code: string) => api<RecoveryResult>('/v1/auth/mfa/recovery-codes', { method: 'POST', auth: true, json: { code } }),
};
