import { createContext, useContext, type ReactNode } from 'react';
import { useUser } from './UserContext';
import { allPermissions } from '../data/adminRoles';
import type { AdminRole, AdminSession, AuditCategory, Permissions } from '../types/admin';
interface Value {
    session: AdminSession | null;
    permissions: Permissions;
    roleName: string;
    signIn: (email: string) => void;
    signOut: () => void;
    log: (category: AuditCategory, action: string, detail?: string) => void;
}
const Context = createContext<Value | null>(null);
export function AdminSessionProvider({ children }: {
    children: ReactNode;
    role?: AdminRole;
}) { const user = useUser(); const permissions = Object.fromEntries(allPermissions.map(key => [key, false])) as Permissions; const role: AdminRole = user.session?.roles.includes('superadmin') ? 'superAdmin' : 'support'; return <Context.Provider value={{ session: user.session ? { name: user.session.name, email: user.session.email, role } : null, permissions, roleName: user.session?.roles.join(', ') || '', signIn: () => { throw new Error('Use normal password/Google login and MFA.'); }, signOut: () => { void user.signOut(); }, log: () => { throw new Error('Legacy audit writes are unavailable.'); } }}>{children}</Context.Provider>; }
export function useAdminSession() { const context = useContext(Context); if (!context)
    throw new Error('Legacy staff screens are unavailable; use StaffWorkspace.'); return context; }
export function roleLabel(role: AdminRole) { return role; }
