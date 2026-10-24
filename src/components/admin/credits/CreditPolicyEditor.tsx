import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {useApiData} from '../../../hooks/useApiData';
import {useUser} from '../../../contexts/UserContext';
import {usePwa} from '../../../contexts/PwaContext';
import {creditLabels,creditsApi,type CreditPolicy,type CreditPolicyResponse} from '../../../api/credits';
import {apiErrorMessage} from '../../../api/client';
import {Field} from '../Field';
import {inputClass,primaryButton} from '../../../utils/formStyles';

export function CreditPolicyEditor({mode}:{mode:'welcome'|'costs'}){
 const {session}=useUser();const {online}=usePwa();
 const allowed=Boolean(session?.roles.includes('superadmin'));
 const state=useApiData<CreditPolicyResponse>(allowed?'/v1/admin/credits/policy':null);
 const [form,setForm]=useState<CreditPolicy|null>(null);const [busy,setBusy]=useState(false);
 useEffect(()=>setForm(state.data?.policy??null),[state.data]);
 if(!allowed)return <p className="p-3 text-sm text-muted">Credit policy changes require superadmin access.</p>;
 if(state.loading)return <p className="p-3 text-sm text-muted">Loading credit settings...</p>;
 if(state.error||!form)return <div className="p-3 text-sm text-danger">{state.error?apiErrorMessage(state.error):'Credit settings are unavailable.'}<button type="button" onClick={state.refresh} className="ml-3 underline">Retry</button></div>;
 const valid=[form.welcome_credits,...Object.values(form.costs)].every(value=>Number.isInteger(value)&&value>=0&&value<=100000);
 const changed=JSON.stringify(form)!==JSON.stringify(state.data?.policy);
 const number=(value:string)=>value===''?NaN:Number(value);
 const save=async()=>{if(!valid||busy||!online)return;setBusy(true);try{const result=await creditsApi.save(form);setForm(result.policy);state.refresh();toast.success('Credit settings saved');}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(false);}};
 return <div className="space-y-4 p-3">
 {mode==='welcome'?<Field label="Welcome credits" hint="Awarded once after verified signup. Set 0 to disable the bonus."><input type="number" min={0} max={100000} step={1} inputMode="numeric" value={Number.isNaN(form.welcome_credits)?'':form.welcome_credits} disabled={!online||busy} onChange={event=>setForm({...form,welcome_credits:number(event.target.value)})} className={inputClass}/></Field>:
 <div className="grid gap-4 sm:grid-cols-2">{Object.entries(creditLabels).map(([key,label])=><Field key={key} label={label}><input type="number" min={0} max={100000} step={1} inputMode="numeric" value={Number.isNaN(form.costs[key as keyof typeof creditLabels])?'':form.costs[key as keyof typeof creditLabels]} disabled={!online||busy} onChange={event=>setForm({...form,costs:{...form.costs,[key]:number(event.target.value)}})} className={inputClass}/></Field>)}</div>}
 {!state.data?.enabled&&<p className="text-sm text-caution">Credit enforcement is disabled on the server. Save the amounts before enabling CREDITS_ENABLED.</p>}
 {!valid&&<p className="text-sm text-danger">Use whole numbers between 0 and 100,000.</p>}
 <button type="button" disabled={!changed||!valid||busy||!online} onClick={()=>void save()} className={`${primaryButton} h-11 disabled:opacity-50`}>{busy?'Saving...':'Save credit settings'}</button>
 <button type="button" disabled={busy||!online} onClick={state.refresh} className="ml-3 text-sm text-brand-dark underline">Reload saved settings</button>
 </div>;
}
