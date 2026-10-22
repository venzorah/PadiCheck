import { Suspense, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { Action, ApiState, panelStyle, Unavailable } from '../../components/ApiUI';
import { RecordView, ResourceList, SchemaForm } from '../../components/ResourceUI';
import { useApiData } from '../../hooks/useApiData';
import { PrivateMediaLink } from '../../components/PrivateMediaLink';
const tabs = [
    ['businesses', 'Businesses', 'businesses.manage'], ['reports', 'Reports', 'reports.moderate'], ['verifications', 'Verification', 'verifications.review'], ['disputes', 'Disputes', 'disputes.resolve'],
    ['ai/providers', 'AI providers', 'ai_config.manage'], ['ai/models', 'AI models', 'ai_config.manage'], ['ai/agents', 'AI agents', 'ai_config.manage'], ['ai/tasks', 'AI tasks', 'ai_config.manage'], ['ai/tools', 'AI tools', 'ai_config.manage'], ['ai/assignments', 'AI assignments', 'ai_config.manage'], ['ai/agent-tools', 'Agent tools', 'ai_config.manage'], ['roles', 'Roles', 'roles.read'], ['billing/offers', 'Billing offers', 'superadmin'], ['billing/events', 'Billing events', 'superadmin'], ['billing/grants', 'Allowance grants', 'superadmin'], ['health', 'Readiness', 'staff'],
];
function ReviewEvidence({ kind, id }: {
    kind: string;
    id: string;
}) {
    const detail = useApiData<Record<string, unknown>>(`/v1/${kind}/${id}`);
    return <><ApiState {...detail}/>{detail.data && <RecordView record={detail.data}/>}{((detail.data?.evidence ?? []) as {
        media_id: string;
    }[]).map((row, index) => <PrivateMediaLink key={index} id={row.media_id}/>)}</>;
}
function StaffSection({ section }: {
    section: string;
}) {
    const { session, hasPermission } = useUser();
    const superadmin = Boolean(session?.roles.includes('superadmin'));
    const [revision, setRevision] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const tab = tabs.find(([key]) => key === section);
    if (!tab)
        return <Unavailable title="Staff feature unavailable" reason="This screen has no supported backend contract. User search/suspension, audit logs, CMS, support tickets, analytics, numerical scores and arbitrary credit adjustments remain unavailable."/>;
    if (!(tab[2] === 'staff' || (tab[2] === 'superadmin' ? superadmin : hasPermission(tab[2]))))
        return <Unavailable title="Permission required" reason="Your current account is not authorized for this staff operation."/>;
    if (section === 'health')
        return <Readiness />;
    if (section === 'roles')
        return <><ResourceList path="/v1/admin/roles" collection="roles" paginate={false} title="Backend roles and permissions"/>{superadmin && hasPermission('roles.manage') && <section className={panelStyle}><h2 className="font-semibold text-ink">Grant a role to a known user</h2><RoleGrant /></section>}</>;
    const isAi = section.startsWith('ai/');
    const isBilling = section.startsWith('billing/');
    const resource = section.split('/').pop()!;
    const path = `/v1/admin/${section}`;
    const idKey = isAi ? `${resource === 'assignments' ? 'assignment' : resource === 'agent-tools' ? 'agent_tool' : resource.slice(0, -1)}_id` : section === 'businesses' ? 'business_profile_id' : section === 'reports' ? 'user_report_id' : section === 'verifications' ? 'verification_request_id' : section === 'disputes' ? 'dispute_id' : section === 'billing/offers' ? 'offer_id' : 'billing_grant_id';
    const canCreate = isAi || section === 'businesses' || section === 'billing/offers';
    return <div className="space-y-5"><h1 className="text-xl font-bold text-ink">{tab[1]}</h1>{canCreate && <details className={panelStyle}><summary className="cursor-pointer font-semibold text-brand-dark">Create {resource}</summary><SchemaForm operation={`POST ${path}`} path={path} omit={!superadmin ? ['credential_secret_ref'] : []} label="Create record" after={() => setRevision(value => value + 1)}/></details>}
    {isAi && <p className="text-sm text-muted">Registry references select configured server credentials; never enter actual API secrets. Changes to agent instructions require a new prompt version. Registry deletion is unsupported.</p>}
    <ResourceList key={`${section}:${revision}`} path={path} collection={isAi ? 'entries' : resource} render={(row, refresh) => {
            const id = String(row[idKey] ?? '');
            return <><RecordView record={row}/>{!id && !(isBilling && resource === 'events') && <p className="text-sm text-muted">No actionable record identifier was returned.</p>}{id && <>
        {(isAi && resource !== 'agent-tools' || section === 'businesses' || section === 'billing/offers') && <details className="mt-4"><summary className="cursor-pointer text-brand-dark">Edit supported fields</summary><SchemaForm operation={`PATCH ${path}/{id}`} path={`${path}/${id}`} omit={!superadmin ? ['credential_secret_ref'] : []} after={refresh} label="Update record"/></details>}
        {section === 'businesses' && hasPermission('directory.manage') && <details className="mt-4"><summary className="cursor-pointer text-brand-dark">Change publication status</summary><SchemaForm operation="POST /v1/admin/businesses/{id}/publication" path={`${path}/${id}/publication`} after={refresh}/></details>}
        {['reports', 'verifications', 'disputes'].includes(section) && <><button className="mt-3 text-brand-dark" onClick={() => setSelected(selected === id ? null : id)}>Open submission details</button>{selected === id && <ReviewEvidence kind={section} id={id}/>}<details className="mt-4"><summary className="cursor-pointer text-brand-dark">Review submission</summary><p className="my-3 text-sm text-muted">Self-review and claimed-business conflicts are rejected by the server. Review status transitions remain authoritative. For disputes, include report action only when resolving.</p><SchemaForm operation={`POST ${path}/{id}/review`} path={`${path}/${id}/review`} after={refresh} label="Submit review decision"/></details></>}
        {section === 'billing/grants' && <details className="mt-3"><summary className="text-danger">Revoke allowance grant</summary><SchemaForm operation="POST /v1/admin/billing/grants/{id}/revoke" path={`${path}/${id}/revoke`} after={refresh}/></details>}
      </>}</>;
        }}/>
  </div>;
}
function RoleGrant() { const [user, setUser] = useState(''); return <><label className="block text-sm text-ink">Known user UUID<input value={user} onChange={event => setUser(event.target.value)} className="my-3 w-full rounded-xl bg-canvas p-3 ring-1 ring-line"/></label>{/^[0-9a-f-]{36}$/i.test(user) && <SchemaForm operation="POST /v1/admin/users/{users_id}/roles" path={`/v1/admin/users/${encodeURIComponent(user)}/roles`} label="Grant role"/>}</>; }
function Readiness() { const state = useApiData<Record<string, unknown>>('/ready', false); return <section className={panelStyle}><h1 className="font-bold text-ink">Backend readiness</h1><ApiState {...state}/>{state.data && <RecordView record={state.data}/>}<button onClick={state.refresh}>Refresh</button><p className="text-sm text-muted">Configuration indicators do not prove provider delivery or worker liveness.</p></section>; }
export function StaffWorkspace() {
    const { session, hasPermission, signOut } = useUser();
    const location = useLocation();
    if (!session)
        return <Navigate to="/signin" replace state={{ from: location.pathname === '/admin/login' ? '/admin' : location.pathname }}/>;
    if (!session.roles.some(role => ['support', 'moderator', 'verifier', 'admin', 'superadmin'].includes(role)))
        return <Unavailable title="Staff access required" reason="Your account has no staff role. Client-selected roles cannot grant access."/>;
    if (location.pathname === '/admin/login')
        return <Navigate to="/admin" replace/>;
    const section = location.pathname.replace(/^\/admin\/?/, '') || tabs.find(([, , permission]) => permission === 'superadmin' ? session.roles.includes('superadmin') : hasPermission(permission))?.[0] || 'health';
    return <div className="min-h-screen bg-canvas px-4 py-6 text-ink"><div className="mx-auto max-w-6xl space-y-5"><header className="flex flex-wrap items-center gap-4"><Link to="/admin" className="text-xl font-bold">PadiCheck staff</Link><span className="text-sm text-muted">{session.name} · {session.roles.join(', ')}</span><Link to="/">Consumer app</Link><Action run={signOut}>Sign out</Action></header><nav className="flex flex-wrap gap-3 border-y border-line py-4 text-sm">{tabs.filter(([, , permission]) => permission === 'staff' || (permission === 'superadmin' ? session.roles.includes('superadmin') : hasPermission(permission))).map(([key, label]) => <Link key={key} className="text-brand-dark" to={`/admin/${key}`}>{label}</Link>)}</nav><Suspense fallback={<p>Loading...</p>}><StaffSection key={section} section={section}/></Suspense></div></div>;
}
