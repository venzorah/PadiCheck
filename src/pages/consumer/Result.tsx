import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/consumer/PageHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { useInvestigation } from '../../hooks/useInvestigation';
import { useUser } from '../../contexts/UserContext';
import { investigationsApi } from '../../api/investigations';
import { mediaApi } from '../../api/media';
import { ApiError, apiErrorMessage } from '../../api/client';
import { investigationLabels, isActiveInvestigation, safeHttpUrl, statusLabels } from '../../utils/investigations';
import type { InvestigationFinding, InvestigationSource } from '../../types/investigation';

function PrivateMediaLink({ id }: { id: string }) {
  const [delivery, setDelivery] = useState<{ url: string; expires_at: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController>();
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!delivery) return;
    const timer = window.setTimeout(() => setDelivery(null), Math.max(0, delivery.expires_at * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [delivery]);
  const prepare = async () => {
    if (busy) return;
    setBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await mediaApi.delivery(id, abort.signal);
      if (!safeHttpUrl(response.url) || response.expires_at * 1000 <= Date.now()) throw new Error('The private file link is unavailable. Request another link.');
      setDelivery(response);
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof ApiError ? apiErrorMessage(failure) : 'Could not prepare a private file link.'); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  };
  return <div className="mt-2 text-sm">
    {delivery ? <a href={delivery.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={(event) => { if (delivery.expires_at * 1000 <= Date.now()) { event.preventDefault(); setDelivery(null); } }} className="font-semibold text-brand-dark">Open private file (temporary link)</a> : <button type="button" disabled={busy} onClick={() => void prepare()} className="font-semibold text-brand-dark disabled:opacity-50">{busy ? 'Preparing file...' : 'View private file'}</button>}
    {error && <p role="alert" className="mt-1 text-danger">{error}</p>}
  </div>;
}
function SourceCard({ source }: { source: InvestigationSource }) {
  const url = safeHttpUrl(source.url);
  return <div className="rounded-2xl bg-canvas p-4">
    <p className="break-words font-medium text-ink">{source.title || source.publisher || 'Source'}</p>
    {source.publisher && <p className="mt-1 text-sm text-muted">{source.publisher}</p>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-1 block break-all text-sm text-brand-dark">{url}</a>}
    {source.excerpt && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-soft">{source.excerpt}</p>}
    {source.support_type && <p className="mt-2 text-xs text-muted">Relationship: {source.support_type}</p>}
    {source.evidence_note && <p className="mt-1 text-sm text-muted">{source.evidence_note}</p>}
    {source.media_id && <PrivateMediaLink id={source.media_id} />}
  </div>;
}
function Evidence({ id, refreshKey }: { id: string; refreshKey: string }) {
  const [sources, setSources] = useState<InvestigationSource[]>([]);
  const [findings, setFindings] = useState<InvestigationFinding[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [moreSources, setMoreSources] = useState(false);
  const [moreFindings, setMoreFindings] = useState(false);
  const offsets = useRef({ sources: 0, findings: 0 });
  const controller = useRef<AbortController>();
  const pending = useRef(false);
  const load = useCallback(async (part: 'both' | 'sources' | 'findings') => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const results = await Promise.allSettled([
        part !== 'findings' ? investigationsApi.sources(id, offsets.current.sources, abort.signal) : Promise.resolve(null),
        part !== 'sources' ? investigationsApi.findings(id, offsets.current.findings, abort.signal) : Promise.resolve(null),
      ]);
      if (abort.signal.aborted) return;
      const [sourceResult, findingResult] = results;
      if (sourceResult.status === 'fulfilled' && sourceResult.value) {
        const page = sourceResult.value.sources;
        setSources((old) => [...new Map([...old, ...page].map((source) => [source.source_id, source])).values()]);
        offsets.current.sources += page.length; setMoreSources(page.length === 20);
      }
      if (findingResult.status === 'fulfilled' && findingResult.value) {
        const page = findingResult.value.findings;
        setFindings((old) => [...new Map([...old, ...page].map((finding) => [finding.finding_id, finding])).values()]);
        setLimitations(findingResult.value.limitations ?? []);
        offsets.current.findings += page.length; setMoreFindings(page.length === 20);
      }
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') setError(apiErrorMessage(failed.reason));
    } finally { if (!abort.signal.aborted) { pending.current = false; setBusy(false); } }
  }, [id]);
  useEffect(() => {
    controller.current?.abort(); pending.current = false;
    offsets.current = { sources: 0, findings: 0 }; setSources([]); setFindings([]); setLimitations([]);
    setMoreSources(false); setMoreFindings(false);
    void load('both');
    return () => controller.current?.abort();
  }, [load, refreshKey]);
  return <>
    <section className="space-y-3 rounded-3xl bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Findings</h2>
      <p className="text-sm text-muted">AI-generated findings remain unverified. A risk signal or claim is not a verified conclusion.</p>
      {limitations.map((note, index) => <p key={index} className="text-sm text-muted">{note}</p>)}
      {!findings.length && !busy && <p className="text-sm text-muted">No findings are available.</p>}
      {findings.map((finding) => {
        const confidence = finding.confidence === null ? NaN : Number(finding.confidence);
        return <article key={finding.finding_id} className="space-y-3 rounded-2xl bg-canvas p-4">
          <p className="text-xs text-muted">{finding.finding_type.replace(/_/g, ' ')} · {finding.category} · Status: {finding.verification_status}</p>
          <h3 className="break-words font-semibold text-ink">{finding.title}</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">{finding.explanation}</p>
          {Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 && <p className="text-xs text-muted">Finding confidence: {Math.round(confidence * 100)}%</p>}
          {(finding.sources ?? []).map((source, index) => <SourceCard key={`${source.source_id}-${index}`} source={source} />)}
        </article>;
      })}
      {moreFindings && <button type="button" disabled={busy} onClick={() => void load('findings')} className="h-11 font-semibold text-brand-dark">Load more findings</button>}
    </section>
    <section className="space-y-3 rounded-3xl bg-surface p-5"><h2 className="text-lg font-semibold text-ink">Sources</h2>{!sources.length && !busy && <p className="text-sm text-muted">No sources are available.</p>}{sources.map((source) => <SourceCard key={source.source_id} source={source} />)}{moreSources && <button type="button" disabled={busy} onClick={() => void load('sources')} className="h-11 font-semibold text-brand-dark">Load more sources</button>}</section>
    {busy && <p role="status" className="text-sm text-muted">Loading evidence...</p>}
    {error && <div role="alert" className="text-sm text-danger">{error}<button type="button" disabled={busy} onClick={() => void load('both')} className="ml-3 font-semibold">Retry loading evidence</button></div>}
  </>;
}

export function Result() {
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const { data, error, refresh } = useInvestigation(id);
  const { session, hasPermission } = useUser();
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [dispatch, setDispatch] = useState((location.state as { dispatch?: string } | null)?.dispatch);
  useEffect(() => { setActionError(''); setDispatch((location.state as { dispatch?: string } | null)?.dispatch); }, [id, location.state]);
  const action = async (name: 'cancel' | 'retry') => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setActionError(''); setConfirmCancel(false);
    try {
      if (name === 'cancel') await investigationsApi.cancel(id);
      else { const result = await investigationsApi.retry(id); setDispatch(result.dispatch); }
      refresh();
    } catch (failure) { setActionError(`${apiErrorMessage(failure)} Refresh the investigation before trying this action again.`); }
    finally { pending.current = false; setBusy(false); }
  };
  const investigation = data?.investigation;
  const active = investigation && isActiveInvestigation(investigation.status);
  const canAct = investigation?.user_id === session?.id && hasPermission('investigations.create');
  return <>
    <PageHeader back="/history" title="Investigation" />
    <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 lg:px-10">
      {Boolean(error) && <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error instanceof ApiError && error.status === 404 ? 'This investigation is unavailable.' : apiErrorMessage(error)}</p>}
      {!data && !error && <p role="status" className="text-muted">Loading investigation...</p>}
      <button type="button" disabled={busy} onClick={refresh} className="h-11 font-semibold text-brand-dark">Refresh investigation</button>
      {investigation && data && <>
        <section className="rounded-3xl bg-surface p-6">
          <p role="status" className="font-medium text-brand-dark">{statusLabels[investigation.status]}</p>
          <h1 className="mt-2 break-words text-2xl font-bold text-ink">{investigation.title || investigationLabels[investigation.investigation_type]}</h1>
          <p className="mt-2 text-sm text-muted">{investigationLabels[investigation.investigation_type]} · {new Date(investigation.created_at).toLocaleString()}</p>
          {active && dispatch === 'deferred' && <p className="mt-4 text-sm text-muted">Your investigation was saved. Dispatch is deferred until background processing is available. Do not submit another copy.</p>}
          {active && <p className="mt-3 text-sm text-muted">This page checks for status updates while visible. You can return through History.</p>}
          {investigation.error_code && <p className="mt-3 text-sm text-danger">Processing error: {investigation.error_code}</p>}
          {investigation.result_summary && <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed text-ink-soft">{investigation.result_summary}</p>}
          {canAct && active && <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="mt-4 h-11 rounded-xl px-4 font-semibold text-danger ring-1 ring-line">Cancel investigation</button>}
          {canAct && investigation.status === 'failed' && <button type="button" disabled={busy} onClick={() => void action('retry')} className="mt-4 h-11 rounded-xl bg-brand px-4 font-semibold text-white">Retry failed investigation</button>}
          {actionError && <p role="alert" className="mt-3 text-sm text-danger">{actionError}</p>}
        </section>
        <section className="space-y-2 rounded-3xl bg-caution-soft p-5 text-sm text-ink-soft"><h2 className="font-semibold">Capabilities and limitations</h2><p>Independent search: {data.capabilities.independent_search ? 'available' : 'unavailable'}. AI analysis: {data.capabilities.ai_analysis ? 'available' : 'unavailable'}.</p>{data.source_collection_complete && !data.capabilities.ai_analysis && <p>Source collection is complete. AI analysis is unavailable; this does not mean an AI result is ready.</p>}{data.limitations.map((note, index) => <p key={index}>{note}</p>)}</section>
        <Evidence key={id} id={id} refreshKey={`${investigation.status}:${data.source_collection_complete}:${investigation.updated_at}`} />
      </>}
      <Link to="/history" className="inline-block font-semibold text-brand-dark">Back to history</Link>
    </div>
    <BottomSheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this investigation?" footer={<button type="button" disabled={busy} onClick={() => void action('cancel')} className="h-12 w-full rounded-2xl bg-danger font-semibold text-white">Cancel investigation</button>}><p className="text-muted">Only active investigations can be cancelled. Cancellation does not promise a refund.</p></BottomSheet>
  </>;
}
