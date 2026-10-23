import { createContext, useContext, type ReactNode } from 'react';
import { useUser } from './UserContext';
import { allPermissions } from '../data/adminRoles';
import type { AdminRole, AdminSession, AuditCategory, Permissions } from '../types/admin';
interface Value {
    session: AdminSession | null;
    permissions: Permissions;
    roleName: string;
    signIn: (email: string, password?: string) => Promise<boolean>;
    signOut: () => void;
    log: (category: AuditCategory, action: string, detail?: string) => void;
}
const Context = createContext<Value | null>(null);
export function AdminSessionProvider({ children }: {
    children: ReactNode;
    role?: AdminRole;
}) {
 const user=useUser();const staff=user.session?.roles.some(role=>['support','moderator','verifier','admin','superadmin'].includes(role));
 const mappings:Record<string,string>={verifyBusinesses:'verifications.review',moderateReports:'reports.moderate',manageDisputes:'disputes.resolve',manageProviders:'ai_config.manage',manageAdmins:'roles.manage'};
 const permissions=Object.fromEntries(allPermissions.map(key=>[key,!!mappings[key]&&user.hasPermission(mappings[key])])) as Permissions;
 const role:AdminRole=user.session?.roles.includes('superadmin')?'superAdmin':'support';
 return <Context.Provider value={{session:staff&&user.session?{name:user.session.name,email:user.session.email,role}:null,permissions,roleName:user.session?.roles.join(', ')||'',signIn:(email,password='')=>user.signIn(email,password),signOut:()=>{void user.signOut();},log:()=>undefined}}>{children}</Context.Provider>;
}

export function useAdminSession() { const context = useContext(Context); if (!context)
    throw new Error('Legacy staff screens are unavailable; use StaffWorkspace.'); return context; }
export function roleLabel(role: AdminRole) { return role; }
