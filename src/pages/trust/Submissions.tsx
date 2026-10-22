import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Action, ApiState, panelStyle } from '../../components/ApiUI';
import { RecordView, ResourceList, SchemaForm } from '../../components/ResourceUI';
import { EvidenceUpload } from '../../components/EvidenceUpload';
import { useApiData } from '../../hooks/useApiData';
import { PrivateMediaLink } from '../../components/PrivateMediaLink';
export function SubmissionDetails({ kind, id }: {
    kind: 'reports' | 'verifications' | 'disputes';
    id: string;
}) {
    const state = useApiData<Record<string, unknown>>(`/v1/${kind}/${encodeURIComponent(id)}`);
    const record = state.data?.[kind === 'reports' ? 'report' : kind === 'verifications' ? 'verification' : 'dispute'] as Record<string, unknown> | undefined;
    const allowed = kind === 'reports' ? ['submitted', 'under_review', 'published'] : kind === 'verifications' ? ['pending', 'in_review'] : ['submitted', 'under_review'];
    return <div className="space-y-3"><ApiState {...state}/>{record && <><RecordView record={record}/>{allowed.includes(String(record.status)) && <Action danger run={() => api(`/v1/${kind}/${encodeURIComponent(id)}/withdraw`, { auth: true, method: 'POST' })} after={state.refresh}>Withdraw submission</Action>}</>}{((state.data?.evidence ?? []) as {
        media_id: string;
    }[]).map((row, index) => <PrivateMediaLink key={index} id={row.media_id}/>)}</div>;
}
export function MySubmissions({ kind = 'reports' }: {
    kind?: 'reports' | 'verifications' | 'disputes';
}) {
    const [selected, setSelected] = useState<string | null>(null);
    const key = kind === 'reports' ? 'user_report_id' : kind === 'verifications' ? 'verification_request_id' : 'dispute_id';
    return <ResourceList key={kind} path={`/v1/${kind}`} collection={kind} title={`Your ${kind}`} render={(row) => <><RecordView record={row}/><button className="mt-3 text-brand-dark" onClick={() => setSelected(selected === row[key] ? null : String(row[key]))}>View submission and evidence</button>{selected === row[key] && <SubmissionDetails kind={kind} id={String(row[key])}/>}{kind === 'verifications' && <Link to={`/business/team?business_profile_id=${row.business_profile_id}`} className="mt-3 block text-brand-dark">Manage this business team (owner only)</Link>}</>}/>;
}
export function ReportIssue() {
    const [params] = useSearchParams();
    const [ids, setIds] = useState<string[]>([]);
    const [saved, setSaved] = useState(false);
    const entity = params.get('entity_id');
    return <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10"><h1 className="text-xl font-bold text-ink">Submit an incident report</h1><p className="text-sm text-muted">Reports are user allegations, subject to staff moderation. Select an entity from a public directory business or your investigation targets.</p>{saved ? <Link to="/my-reports" className="text-brand-dark">Report submitted — view your reports</Link> : <section className={panelStyle}><EvidenceUpload onChange={setIds}/><SchemaForm operation="POST /v1/reports" path="/v1/reports" defaults={{ ...(entity ? { entity_id: entity } : {}), media_ids: ids }} after={() => setSaved(true)} label="Submit report"/></section>}</div>;
}
export function MyReports() { const [kind, setKind] = useState<'reports' | 'verifications' | 'disputes'>('reports'); return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10"><h1 className="text-xl font-bold text-ink">Your submissions</h1><nav className="flex gap-3">{(['reports', 'verifications', 'disputes'] as const).map((value) => <button key={value} onClick={() => setKind(value)} className={kind === value ? 'font-bold text-brand-dark' : 'text-muted'}>{value}</button>)}</nav><MySubmissions kind={kind}/></div>; }
export function VerificationRequest() { const [params] = useSearchParams(); const [ids, setIds] = useState<string[]>([]); const [saved, setSaved] = useState(false); const business = params.get('business_profile_id'); return <div className="space-y-4"><h1 className="text-xl font-bold text-ink">Business verification request</h1><p className="text-sm text-muted">An approved evidence review assigns the business claim. It does not issue a certificate or guarantee business behavior.</p>{!business ? <Link to="/directory" className="text-brand-dark">Choose a published business from the directory</Link> : saved ? <MySubmissions kind="verifications"/> : <section className={panelStyle}><EvidenceUpload onChange={setIds}/>{ids.length > 0 && <SchemaForm operation="POST /v1/verifications" path="/v1/verifications" defaults={{ business_profile_id: business, media_ids: ids }} after={() => setSaved(true)} label="Submit evidence for review"/>}</section>}</div>; }
