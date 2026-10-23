import { useApiData } from '../hooks/useApiData';
import { PrivateMediaLink } from './PrivateMediaLink';
import { ApiState } from './ApiUI';
export function SubmissionEvidence({kind,id}:{kind:'reports'|'verifications'|'disputes';id:string}){
 const state=useApiData<{evidence?:{media_id:string}[]}>('/v1/'+kind+'/'+encodeURIComponent(id));
 return <div className="mt-2 space-y-2"><ApiState loading={state.loading} error={state.error}/>{state.data?.evidence?.map(row=><div key={row.media_id} className="rounded-xl bg-canvas px-3 py-2"><PrivateMediaLink id={row.media_id}/></div>)}</div>;
}
