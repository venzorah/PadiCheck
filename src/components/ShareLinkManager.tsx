import { useState } from 'react';
import { toast } from 'sonner';
import { BottomSheet } from './BottomSheet';
import { ApiState } from './ApiUI';
import { useApiData } from '../hooks/useApiData';
import { api, apiErrorMessage } from '../api/client';
import { formatWhen } from '../utils/checks';
interface Share {share_link_id:string;created_at:string;expires_at:string;revoked_at:string|null;active:boolean;}
function ShareLinks({id}:{id:string}) {
  const [offset,setOffset]=useState(0);const [busy,setBusy]=useState<string|null>(null);
  const state=useApiData<{shares:Share[]}>('/v1/investigations/'+encodeURIComponent(id)+'/share-links?limit=20&offset='+offset);
  const revoke=async(share:Share)=>{if(busy)return;setBusy(share.share_link_id);try{await api('/v1/investigations/'+encodeURIComponent(id)+'/share-links/'+encodeURIComponent(share.share_link_id)+'/revoke',{auth:true,method:'POST'});state.refresh();toast.success('Shared link revoked');}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(null);}};
  return <div className="space-y-3"><ApiState loading={state.loading} error={state.error}/>{state.data?.shares.length===0&&<p className="text-sm text-muted">No shared links on this page.</p>}<ul className="divide-y divide-line overflow-hidden rounded-2xl bg-canvas">{state.data?.shares.map(row=><li key={row.share_link_id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{row.revoked_at?'Revoked':row.active?'Active':'Expired'}</p><p className="text-xs text-muted">Created {formatWhen(row.created_at)} · Expires {formatWhen(row.expires_at)}</p></div>{row.active&&<button type="button" disabled={busy!==null} onClick={()=>void revoke(row)} className="h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-danger disabled:opacity-50">Revoke</button>}</li>)}</ul><div className="flex justify-between text-sm font-semibold text-brand-dark"><button type="button" className="h-11 px-3 disabled:opacity-40" disabled={state.loading||offset===0} onClick={()=>setOffset(value=>Math.max(0,value-20))}>Previous</button><button type="button" className="h-11 px-3 disabled:opacity-40" disabled={state.loading||state.data?.shares.length!==20} onClick={()=>setOffset(value=>value+20)}>Next</button></div><p className="text-xs text-muted">Secret URLs are shown only when created. Revoking a link stops future access through it.</p></div>;
}
export function ShareLinkManager({id,open,onClose}:{id:string;open:boolean;onClose:()=>void}){return <BottomSheet open={open} onClose={onClose} title="Manage shared links">{open&&<ShareLinks id={id}/>}</BottomSheet>;}
