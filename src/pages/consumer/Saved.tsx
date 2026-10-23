import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import type { Bookmark } from '../../api/bookmarks';
import { investigationView } from '../../utils/presentationAdapters';
import { BookmarkIcon } from 'lucide-react';
import { PageHeader } from '../../components/consumer/PageHeader';
import { ResultRow } from '../../components/consumer/ResultRow';
import { useUser } from '../../contexts/UserContext';
import { useOpenCheck } from '../../hooks/useOpenCheck';
import { ApiState } from '../../components/ApiUI';

export function Saved() {
  const [offset,setOffset]=useState(0);
  const history=useApiData<{bookmarks:Bookmark[]}>('/v1/me/bookmarks?limit=20&offset='+offset);
  const saved=(history.data?.bookmarks||[]).map(row=>investigationView({...row,user_id:'',created_at:row.bookmarked_at,updated_at:row.bookmarked_at,started_at:null,completed_at:null,error_code:null}));
  useUser();
  const openCheck = useOpenCheck();


  return (
    <>
      <PageHeader title="Saved" />
      <ApiState loading={history.loading} error={history.error}/>
      <div className="mx-auto w-full max-w-3xl px-4 lg:px-10">
        
        {saved.length > 0 && <h2 className="mb-1 font-semibold text-ink">Saved reports</h2>}
        {saved.length === 0 ?
        <div className="mt-6 flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center">
            <BookmarkIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">Nothing saved yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted">Save a report to keep it handy. Reconnect to open saved reports.</p>
            <button type="button" onClick={openCheck} className="mt-5 h-12 rounded-2xl bg-ink px-6 font-semibold text-white hover:bg-ink-soft">
              Start a check
            </button>
          </div> :

        <>
            <p className="text-sm text-muted">Saved reports are private to your account and need a connection.</p>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-surface">
              {saved.map((r) =>
            <ResultRow key={r.id} result={{ ...r, availableOffline: false }} />
            )}
            </ul>
          </>
        }
        <div className="mt-4 flex justify-between text-sm font-semibold text-brand-dark"><button disabled={!offset||history.loading} onClick={()=>setOffset(value=>Math.max(0,value-20))}>Previous</button><button disabled={history.loading||history.data?.bookmarks.length!==20} onClick={()=>setOffset(value=>value+20)}>Next</button></div>
      </div>
    </>);

}