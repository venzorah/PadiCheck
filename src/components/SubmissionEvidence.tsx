import { useApiData } from '../hooks/useApiData';
import { PrivateMediaLink } from './PrivateMediaLink';
import { ApiState } from './ApiUI';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '../api/client';
export function SubmissionEvidence({kind,id,allowWithdraw=false,onWithdraw}:{kind:'reports'|'verifications'|'disputes';id:string;allowWithdraw?:boolean;onWithdraw?:()=>void}){
 const state=useApiData<{report?:{status:string};verification?:{status:string};dispute?:{status:string};evidence?:{media_id:string}[]}>('/v1/'+kind+'/'+encodeURIComponent(id));
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 const record=state.data?.[kind==='reports'?'report':kind==='verifications'?'verification':'dispute'];
 const canWithdraw=allowWithdraw&&!!record&&(kind==='reports'?['submitted','under_review','published']:kind==='verifications'?['pending','in_review']:['submitted','under_review']).includes(record.status);
 const withdraw=async()=>{if(lock.current||!canWithdraw)return;lock.current=true;setBusy(true);try{await api('/v1/'+kind+'/'+encodeURIComponent(id)+'/withdraw',{auth:true,method:'POST'});state.refresh();onWithdraw?.();window.dispatchEvent(new Event('padicheck-data-updated'));toast.success('Submission withdrawn');}catch(error){toast.error(apiErrorMessage(error));}finally{lock.current=false;setBusy(false);}};
 return <div className="mt-2 space-y-2"><ApiState loading={state.loading} error={state.error}/>{state.data?.evidence?.map(row=><div key={row.media_id} className="rounded-xl bg-canvas px-3 py-2"><PrivateMediaLink id={row.media_id}/></div>)}{canWithdraw&&<button type="button" disabled={busy} onClick={()=>void withdraw()} className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-danger ring-1 ring-line disabled:opacity-50">{busy?'Withdrawing...':'Withdraw submission'}</button>}</div>;
}
