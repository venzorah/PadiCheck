import { useState } from 'react';
import { api } from '../api/client';
import { Action, SimpleForm, inputStyle, panelStyle } from './ApiUI';
import { ResourceList } from './ResourceUI';
export function InvestigationSharing({ id }: {
    id: string;
}) {
    const [link, setLink] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    return <section className={panelStyle}><h2 className="font-semibold text-ink">Share completed investigation</h2><p className="text-sm text-muted">A share exposes a limited result to anyone with the link. Summaries may contain sensitive information. Private files and prompts are excluded.</p><SimpleForm label="Create private share link" submit={async (data) => {
            if (!data.get('acknowledge'))
                throw new Error('Acknowledge the sensitive content before sharing.');
            const result = await api<{
                token: string;
            }>(`/v1/investigations/${encodeURIComponent(id)}/share-links`, { method: 'POST', auth: true, json: { acknowledge_sensitive_content: true, ttl_seconds: Number(data.get('ttl')) } });
            setLink(`${window.location.origin}/shared#${encodeURIComponent(result.token)}`);
            setRevision(value => value + 1);
        }}><label className="block text-sm text-ink"><input type="checkbox" name="acknowledge" required/> I understand this may expose sensitive result content.</label><label className="block text-sm text-ink">Expires in seconds (60 to 2,592,000)<input name="ttl" type="number" min={60} max={2592000} defaultValue={604800} required className={inputStyle}/></label></SimpleForm>{link && <div className="space-y-2"><p className="text-sm text-muted">Copy this link now. It cannot be retrieved again.</p><input readOnly value={link} aria-label="New share link" onFocus={event => event.currentTarget.select()} className={inputStyle}/><button className="text-brand-dark" onClick={() => setLink(null)}>Dismiss link</button></div>}<ResourceList key={revision} path={`/v1/investigations/${id}/share-links`} collection="shares" render={(row, refresh) => <><p className="text-sm text-muted">Expires {new Date(String(row.expires_at)).toLocaleString()} · {row.active ? 'Active' : 'Unavailable'}</p>{Boolean(row.active) && <Action danger run={() => api(`/v1/investigations/${id}/share-links/${row.share_link_id}/revoke`, { auth: true, method: 'POST' })} after={refresh}>Revoke share</Action>}</>}/></section>;
}
