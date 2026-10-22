import { api } from './client';
export interface Registration {
    display_name: string;
    email: string;
    password: string;
}
export interface Challenge {
    challenge_id: string;
    expires_in: number;
    message: string;
}
export interface AuthUser {
    users_id: string;
    display_name: string;
    email: string;
    email_verified: boolean;
    roles: string[];
    permissions: string[];
}
export interface AuthSession {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
}
export interface MfaChallenge {
    mfa_required: true;
    challenge_token: string;
    expires_in: number;
}
export type LoginResponse = AuthSession | MfaChallenge;
export const authApi = {
    register: (json: Registration) => api<Challenge>('/v1/auth/register', { method: 'POST', json }),
    verify: (json: {
        email: string;
        challenge_id: string;
        code: string;
    }) => api<AuthSession>('/v1/auth/register/verify', { method: 'POST', json }),
    login: (email: string, password: string) => api<LoginResponse>('/v1/auth/login', { method: 'POST', json: { email, password } }),
    me: (token: string) => api<{
        user: AuthUser;
    }>('/v1/auth/me', { auth: true, token }),
    logout: () => api<void>('/v1/auth/logout', { method: 'POST', auth: true }),
    googleChallenge: (action: 'login' | 'link', signal?: AbortSignal) => api<{
        nonce: string;
        expires_in: number;
    }>('/v1/auth/google/challenge', { method: 'POST', json: { action }, auth: action === 'link', signal }),
    googleLogin: (id_token: string) => api<LoginResponse>('/v1/auth/google', { method: 'POST', json: { id_token } }),
    verifyMfa: (challenge_token: string, code: string) => api<AuthSession>('/v1/auth/mfa/verify', { method: 'POST', json: { challenge_token, code } }),
    linkGoogle: (id_token: string) => api<{
        linked: boolean;
    }>('/v1/auth/google/link', { method: 'POST', auth: true, json: { id_token } }),
};
