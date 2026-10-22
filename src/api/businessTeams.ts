import { api } from './client';
export type MemberRole = 'manager' | 'editor' | 'viewer';
export interface Invitation {
    invitation_id: string;
    business_profile_id: string;
    member_role: MemberRole;
    email?: string;
    expires_at: string;
    accepted_at?: string | null;
    revoked_at?: string | null;
}
export interface Team {
    owner_user_id: string;
    members: {
        users_id: string;
        display_name: string;
        member_role: MemberRole;
        joined_at: string;
    }[];
    invitations: Invitation[];
}
const base = (id: string) => `/v1/businesses/${encodeURIComponent(id)}`;
export const businessTeamsApi = {
    invite: (id: string, email: string, member_role: MemberRole) => api(`${base(id)}/invitations`, { auth: true, method: 'POST', json: { email, member_role } }),
    revoke: (id: string, invitation: string) => api<void>(`${base(id)}/invitations/${encodeURIComponent(invitation)}`, { auth: true, method: 'DELETE' }),
    accept: (id: string) => api(`/v1/me/business-invitations/${encodeURIComponent(id)}/accept`, { auth: true, method: 'POST' }),
    role: (id: string, user: string, member_role: MemberRole) => api(`${base(id)}/team/${encodeURIComponent(user)}`, { auth: true, method: 'PATCH', json: { member_role } }),
    remove: (id: string, user: string) => api<void>(`${base(id)}/team/${encodeURIComponent(user)}`, { auth: true, method: 'DELETE' }),
    profile: (id: string, business_category: string, profile_description: string | null) => api(`${base(id)}/profile`, { auth: true, method: 'PATCH', json: { business_category, profile_description } }),
};
