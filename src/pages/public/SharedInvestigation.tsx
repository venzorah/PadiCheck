import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../api/client';
import type { InvestigationFinding } from '../../types/investigation';
import { safeHttpUrl } from '../../utils/investigations';
import { panelStyle } from '../../components/ApiUI';
export function SharedInvestigation() {
    const [data, setData] = useState<{
        investigation: {
            title: string;
            result_summary: string | null;
        };
        findings: InvestigationFinding[];
        findings_truncated: boolean;
        limitations: string[];
    } | null>(null);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const tokenRef = useRef<string | null>(null);
    useEffect(() => {
        let token = tokenRef.current ?? '';
        try {
            if (tokenRef.current === null) { token = decodeURIComponent(window.location.hash.slice(1)); tokenRef.current = token; }
        }
        catch { /* Invalid token. */ }
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        if (!token) {
            setError('This shared investigation is unavailable.');
            return;
        }
        setError('');
        const abort = new AbortController();
        void api<NonNullable<typeof data>>('/v1/shared-investigations/resolve', { method: 'POST', json: { token }, signal: abort.signal }).then(result => { if (!abort.signal.aborted)
            setData(result); }).catch(failure => { if (!abort.signal.aborted)
            setError(failure?.status === 404 ? 'This shared investigation is unavailable.' : apiErrorMessage(failure)); });
        return () => abort.abort();
    }, [revision]); // eslint-disable-line react-hooks/exhaustive-deps
    return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">{error ? <div role="alert" className="text-danger">{error}{tokenRef.current && <button type="button" onClick={() => setRevision(value => value + 1)} className="ml-3 font-semibold text-brand-dark">Retry loading</button>}</div> : !data ? <p role="status">Loading shared investigation...</p> : <><section className={panelStyle}><h1 className="text-2xl font-bold text-ink">{data.investigation.title}</h1><p className="whitespace-pre-wrap text-ink">{data.investigation.result_summary}</p>{data.limitations.map((note, index) => <p key={index} className="text-sm text-muted">{note}</p>)}</section>{data.findings.map(finding => <section key={finding.finding_id} className={panelStyle}><h2 className="font-semibold text-ink">{finding.title}</h2><p className="text-sm text-muted">{finding.finding_type} · {finding.verification_status}</p><p className="whitespace-pre-wrap text-ink">{finding.explanation}</p>{finding.sources.map((source, index) => { const url = safeHttpUrl(source.url); return <div key={index}><p className="text-sm text-muted">{source.title} · {source.support_type}</p>{url && <a className="break-all text-brand-dark" href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open public source</a>}</div>; })}</section>)}{data.findings_truncated && <p className="text-muted">This shared view contains only the first 100 findings.</p>}</>}</div>;
}
