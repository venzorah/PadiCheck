import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookmarkCheckIcon, BookmarkIcon, CircleCheckIcon, CloudOffIcon, CopyIcon, LinkIcon, MessageCircleIcon, Share2Icon } from 'lucide-react';
import { ShareLinkManager } from '../../components/ShareLinkManager';
import { BottomSheet } from '../../components/BottomSheet';
import { PageHeader } from '../../components/consumer/PageHeader';
import { VerdictBadge } from '../../components/consumer/VerdictBadge';
import { InstallCard } from '../../components/pwa/InstallCard';
import { usePwa } from '../../contexts/PwaContext';
import { useUser } from '../../contexts/UserContext';
import { useInvestigation } from '../../hooks/useInvestigation';
import { useApiData } from '../../hooks/useApiData';
import { investigationsApi } from '../../api/investigations';
import { api, apiErrorMessage } from '../../api/client';
import { investigationView } from '../../utils/presentationAdapters';
import { PrivateMediaLink } from '../../components/PrivateMediaLink';
import { ApiState } from '../../components/ApiUI';
import type { InvestigationFinding, InvestigationSource } from '../../types/investigation';
import { safeHttpUrl } from '../../utils/investigations';
import { formatWhen } from '../../utils/checks';
import { verdictTone } from '../../utils/verdict';


function useEvidenceRows<T>(id:string, collection:'findings'|'sources') {
  const [offset,setOffset]=useState(0);
  const [rows,setRows]=useState<T[]>([]);
  const state=useApiData<Record<string,T[]>>(id?'/v1/investigations/'+encodeURIComponent(id)+'/'+collection+'?limit=50&offset='+offset:null);
  useEffect(()=>{setOffset(0);setRows([]);},[id]);
  useEffect(()=>{if(state.data)setRows(previous=>offset===0?state.data![collection]:[...previous,...state.data![collection]]);},[state.data]); // eslint-disable-line react-hooks/exhaustive-deps
  return {...state,rows,more:state.data?.[collection]?.length===50,loadMore:()=>setOffset(value=>value+50)};
}

export function Result() {
  const { id } = useParams<{id: string;}>();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const detail = useInvestigation(id || '');
  const findings=useEvidenceRows<InvestigationFinding>(id||'', 'findings');
  const sources=useEvidenceRows<InvestigationSource>(id||'', 'sources');
  useEffect(()=>{if(detail.data?.investigation.status==='completed'){findings.refresh();sources.refresh();}},[detail.data?.investigation.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = detail.data ? {...investigationView(detail.data.investigation), sections:findings.rows.map(row=>({label:row.verification_status,verdict:'caution' as const,headline:row.title,detail:row.explanation})),toCheck:detail.data.limitations} : null;
  const [manageShares,setManageShares]=useState(false);
  const [shareUrl,setShareUrl]=useState('');
  const [saving,setSaving]=useState(false);
  const { online, install } = usePwa();
  const { isSaved, toggleSaved, hasPermission, session } = useUser();
  const [shareOpen, setShareOpen] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    if (isNew) install.markEngaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  if (!result && !detail.error) return <><PageHeader back title="Report"/><div className="mx-auto max-w-6xl px-4 lg:px-10"><ApiState loading/></div></>;
  if (!result || !online) {
    const offline = Boolean(result);
    return (
      <>
        <PageHeader back title="Report" />
        <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 text-center">
          <CloudOffIcon className="h-10 w-10 text-muted" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-ink">{offline ? 'This report isn’t on your device' : 'Report not found'}</h1>
          <p className="mt-2 text-muted">
            {offline ? 'Reconnect to open it. Saved reports need a connection.' : 'It may have been deleted or the link is incomplete.'}
          </p>
          <Link to="/history" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-ink px-6 font-semibold text-white">
            Go to history
          </Link>
        </div>
      </>);

  }

  const saved = isSaved(result.id);

  const shareText = `PadiCheck on “${result.title}”: ${result.summary}`;

  const nativeShare = async () => {
    try {
      await navigator.share({ title: result.title, text: shareText, url: shareUrl });
      setShareOpen(false);
    } catch {

      // User cancelled the system share sheet.
    }};
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Couldn’t copy on this device');
    }
    setShareOpen(false);
  };
  const toggleSave = async () => {
    if(saving)return;setSaving(true);
    try {await toggleSaved(result.id);toast(saved?'Removed from Saved':'Saved');}catch(error){toast.error(apiErrorMessage(error));}finally{setSaving(false);}
  };
  const openShare = async () => {
    if(detail.data?.investigation.status!=='completed'){toast('Sharing is available after this investigation completes.');return;}
    if(!window.confirm('Anyone with this link can read the summary and findings, which may contain sensitive content. Create a share link?'))return;
    try {const response=await api<{token:string}>('/v1/investigations/'+result.id+'/share-links',{auth:true,method:'POST',json:{acknowledge_sensitive_content:true,ttl_seconds:604800}});setShareUrl(window.location.origin+'/shared#'+encodeURIComponent(response.token));setShareOpen(true);}catch(error){toast.error(apiErrorMessage(error));}
  };

  const actionButtons =
  <>
      <button
      type="button"
      disabled={saving} onClick={()=>void toggleSave()}
      aria-pressed={saved}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-ink transition-colors hover:bg-canvas">
      
        {saved ? <BookmarkCheckIcon className="h-5 w-5 text-brand" aria-hidden="true" /> : <BookmarkIcon className="h-5 w-5" aria-hidden="true" />}
        {saved ? 'Saved' : 'Save'}
      </button>
      <button
      type="button"
      onClick={()=>void openShare()}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink font-semibold text-white transition-colors hover:bg-ink-soft">
      
        <Share2Icon className="h-5 w-5" aria-hidden="true" /> Share
      </button>
    </>;


  return (
    <>
      <PageHeader
        back="/history"
        title=""
        actions={
        <button type="button" onClick={()=>void openShare()} aria-label="Share report" className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-ink/5 lg:hidden">
            <Share2Icon className="h-5 w-5" />
          </button>
        } />
      
      <article className="mx-auto w-full max-w-6xl px-4 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-10">
        <header className="lg:sticky lg:top-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{result.categoryLabel}</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-tight text-ink lg:text-[32px]">{result.title}</h1>
          {result.price && <p className="mt-1 text-xl font-semibold text-ink">{result.price}</p>}
          <p className="mt-1.5 text-sm text-muted">
            {result.source} · {formatWhen(result.createdAt)}
          </p>
          <div className={`mt-5 rounded-3xl p-5 bg-brand-soft`}>
            <VerdictBadge verdict={result.verdict} size="lg" label={result.status} />
            <p className="mt-3 text-[17px] font-medium leading-snug text-ink">{result.summary}</p>
          </div>
          {detail.data?.investigation.user_id===session?.id && hasPermission('investigations.create') && <div className="mt-3 flex gap-3 text-sm font-semibold text-brand-dark">{['queued','collecting_sources','analyzing'].includes(detail.data?.investigation.status || '')&&<button onClick={async()=>{try{await investigationsApi.cancel(result.id);detail.refresh();}catch(error){toast.error(apiErrorMessage(error));}}}>Cancel check</button>}{detail.data?.investigation.status==='failed'&&<button onClick={async()=>{try{await investigationsApi.retry(result.id);detail.refresh();}catch(error){toast.error(apiErrorMessage(error));}}}>Retry check</button>}</div>}
          <div className="mt-4 hidden grid-cols-2 gap-3 lg:grid">{actionButtons}</div>
          <p className="mt-3 text-xs text-muted">
            Server status: {result.status}
            {result.availableOffline ? ' · Available offline' : ''}
          </p>
        </header>

        <div className="mt-6 space-y-7 lg:mt-0">
          <ApiState error={detail.error||findings.error||sources.error}/>
          <section aria-label="Breakdown">
            <ul className="grid gap-3 sm:grid-cols-2">
              {result.sections.map((section,index) =>
              <li key={index} className="rounded-3xl bg-surface p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    <span className={`h-2 w-2 rounded-full ${verdictTone[section.verdict].dot}`} aria-hidden="true" />
                    {section.label}
                  </p>
                  <p className={`mt-2 text-[17px] font-semibold leading-snug ${verdictTone[section.verdict].text}`}>{section.headline}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{section.detail}</p>
                </li>
              )}
            </ul>
          </section>

          {findings.more&&<button disabled={findings.loading} onClick={findings.loadMore} className="h-11 rounded-xl px-4 text-sm font-semibold text-brand-dark ring-1 ring-line">More findings</button>}
          <section aria-labelledby="good-heading">
            <h2 id="good-heading" className="text-lg font-semibold text-ink">
              What looks good
            </h2>
            <ul className="mt-3 space-y-3">
              {result.looksGood.map((item) =>
              <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                  <CircleCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  {item}
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="check-heading">
            <h2 id="check-heading" className="text-lg font-semibold text-ink">
              What to check
            </h2>
            <p className="text-sm text-muted">Tick these off as you go.</p>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-surface">
              {result.toCheck.map((item) => {
                const ticked = done.includes(item);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={ticked}
                      onClick={() => setDone((d) => ticked ? d.filter((x) => x !== item) : [...d, item])}
                      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas/60">
                      
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${ticked ? 'border-brand bg-brand text-white' : 'border-line'}`}>
                        
                        {ticked && <CircleCheckIcon className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <span className={`text-[15px] ${ticked ? 'text-muted line-through' : 'text-ink'}`}>{item}</span>
                    </button>
                  </li>);

              })}
            </ul>
          </section>

          {detail.data?.investigation.user_id===session?.id&&<button type="button" onClick={()=>setManageShares(true)} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-brand-dark ring-1 ring-line">Manage shared links</button>}
          <section className="space-y-3"><h2 className="text-lg font-semibold text-ink">Sources</h2>{sources.rows.map(source=><div key={source.source_id} className="rounded-3xl bg-surface p-4"><p className="font-semibold text-ink">{source.title||source.publisher||'Source'}</p><p className="mt-1 text-sm text-muted">{source.excerpt}</p>{safeHttpUrl(source.url)&&<a href={safeHttpUrl(source.url)!} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-dark">Open source</a>}{source.media_id&&<PrivateMediaLink id={source.media_id}/>}</div>)}{sources.more&&<button disabled={sources.loading} onClick={sources.loadMore} className="h-11 rounded-xl px-4 text-sm font-semibold text-brand-dark ring-1 ring-line">More sources</button>}</section>
          {isNew && <InstallCard context="Get notified when reports are ready and open PadiCheck straight from your home screen." />}
        </div>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3">{actionButtons}</div>
      </div>

      <ShareLinkManager id={result.id} open={manageShares} onClose={()=>setManageShares(false)}/>
      <BottomSheet open={shareOpen} onClose={() => {setShareOpen(false);setShareUrl('');}} title="Share this report">
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-canvas">
          {typeof navigator.share === 'function' &&
          <li>
              <button type="button" onClick={nativeShare} className="flex h-14 w-full items-center gap-3 px-4 font-medium text-ink hover:bg-line/50">
                <Share2Icon className="h-5 w-5 text-muted" aria-hidden="true" /> Share via…
              </button>
            </li>
          }
          <li>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShareOpen(false)}
              className="flex h-14 w-full items-center gap-3 px-4 font-medium text-ink hover:bg-line/50">
              
              <MessageCircleIcon className="h-5 w-5 text-muted" aria-hidden="true" /> WhatsApp
            </a>
          </li>
          <li>
            <button type="button" onClick={() => copy(shareUrl, 'Link')} className="flex h-14 w-full items-center gap-3 px-4 font-medium text-ink hover:bg-line/50">
              <LinkIcon className="h-5 w-5 text-muted" aria-hidden="true" /> Copy link
            </button>
          </li>
          <li>
            <button type="button" onClick={() => copy(shareText, 'Summary')} className="flex h-14 w-full items-center gap-3 px-4 font-medium text-ink hover:bg-line/50">
              <CopyIcon className="h-5 w-5 text-muted" aria-hidden="true" /> Copy summary
            </button>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">Shared links only show the summary. Your uploaded files are never included.</p>
      </BottomSheet>
    </>);

}