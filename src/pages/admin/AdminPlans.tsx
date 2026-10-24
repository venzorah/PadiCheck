import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import {PlusIcon,PencilIcon} from 'lucide-react';
import {AdminPageHeader} from '../../components/admin/AdminPageHeader';
import {Field} from '../../components/admin/Field';
import {BottomSheet} from '../../components/BottomSheet';
import {ConfirmSheet} from '../../components/ConfirmSheet';
import {Switch} from '../../components/Switch';
import {ApiState} from '../../components/ApiUI';
import {useApiData} from '../../hooks/useApiData';
import {useUser} from '../../contexts/UserContext';
import {plansApi,type BillingPlan,type PlanInput} from '../../api/plans';
import {apiErrorMessage} from '../../api/client';
import {inputClass,primaryButton,textareaClass} from '../../utils/formStyles';
import {formatNaira} from '../../utils/checks';
import {planDraft} from '../../utils/planDraft';

const blank:PlanInput={plan_key:'',audience:'consumer',display_name:'',tagline:'',currency:'NGN',monthly_amount:'0.00',yearly_amount:'0.00',monthly_credits:0,yearly_credits:0,features:[],is_popular:false,is_published:false};
export function AdminPlans(){
 const {session}=useUser();const allowed=Boolean(session?.roles.includes('superadmin'));const navigate=useNavigate();const location=useLocation();
 const data=useApiData<{plans:BillingPlan[]}>(allowed?'/v1/admin/billing/plans?limit=100':null);
 const [form,setForm]=useState<PlanInput|null>(null);const [editing,setEditing]=useState<BillingPlan|null>(null);const [benefits,setBenefits]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [enable,setEnable]=useState<BillingPlan|null>(null);
 useEffect(()=>{if(location.pathname.endsWith('/new')){const template=planDraft(new URLSearchParams(location.search).get('template'));setEditing(null);setForm(template??{...blank});setBenefits(template?.features.join('\n')??'');setError('');}},[location.pathname,location.search]);
 const close=()=>{if(busy)return;setForm(null);setError('');if(location.pathname.endsWith('/new'))navigate('/admin/plans',{replace:true});};
 const field=<K extends keyof PlanInput>(key:K,value:PlanInput[K])=>setForm(current=>current?{...current,[key]:value}:null);
 const save=async()=>{if(!form||busy)return;setBusy(true);setError('');try{
 const validMoney=(value:string)=>/^\d+(\.\d{1,2})?$/.test(value)&&Number.isFinite(Number(value));if(!validMoney(form.monthly_amount)||!validMoney(form.yearly_amount))throw Error('Use valid naira amounts with at most two decimal places');
 const value={...form,display_name:form.display_name.trim(),monthly_amount:Number(form.monthly_amount).toFixed(2),yearly_amount:Number(form.yearly_amount).toFixed(2),features:benefits.split('\n').map(v=>v.trim()).filter(Boolean)};
 if(editing)await plansApi.save(editing,value);else await plansApi.create(value);
 setForm(null);navigate('/admin/plans',{replace:true});data.refresh();toast.success('Plan saved');
 }catch(failure){setError(apiErrorMessage(failure));}finally{setBusy(false);}};
 const activate=async()=>{if(!enable||busy)return;setBusy(true);try{await plansApi.enable(enable.plan_id);setEnable(null);data.refresh();toast.success('Naira checkout enabled — manual renewal');}catch(failure){toast.error(apiErrorMessage(failure));}finally{setBusy(false);}};
 if(!allowed)return <><AdminPageHeader title="Plans" subtitle="Plan management requires superadmin access."/></>;
 return <><AdminPageHeader title="Plans" subtitle="Naira prices, credit allowances, benefits and featured plans." actions={<button className={`${primaryButton} h-11`} onClick={()=>navigate('/admin/plans/new')}><PlusIcon className="h-4 w-4"/>New plan</button>}/>
 <div className="space-y-4 px-4 pb-24 md:px-8"><ApiState loading={data.loading} error={data.error}/><button className="text-sm font-semibold text-brand-dark" onClick={data.refresh}>Refresh plans</button>
 <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.data?.plans.map(plan=><li key={plan.plan_id} className={`rounded-3xl bg-surface p-5 ring-1 ${plan.is_popular?'ring-brand':'ring-line'}`}>
 <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-ink">{plan.display_name}</h2>{plan.is_popular&&<span className="rounded-full bg-brand-soft px-2 py-1 text-xs text-brand-dark">Most popular</span>}<span className="text-xs text-muted">{plan.is_published?'Published':'Draft'}</span></div>
 <p className="mt-2 text-sm text-muted">{plan.tagline}</p><p className="mt-4 text-xl font-bold text-ink">{formatNaira(Number(plan.monthly_amount))}<span className="text-sm font-normal text-muted"> / month</span></p><p className="mt-1 text-sm text-muted">{plan.monthly_credits} credits · {formatNaira(Number(plan.yearly_amount))} / year · {plan.yearly_credits} credits</p>
 <ul className="mt-4 space-y-2 text-sm text-ink-soft">{plan.features.map(feature=><li key={feature}>{feature}</li>)}</ul>
 <div className="mt-5 flex flex-wrap gap-2"><button className="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold text-ink ring-1 ring-line" onClick={()=>{setEditing(plan);setForm(Object.fromEntries(Object.keys(blank).map(key=>[key,plan[key as keyof BillingPlan]])) as unknown as PlanInput);setBenefits(plan.features.join('\n'));setError('');}}><PencilIcon className="h-4 w-4"/>Edit</button>
 <button disabled={!plan.is_published||busy||Number(plan.monthly_amount)+Number(plan.yearly_amount)===0} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-brand-dark ring-1 ring-line disabled:opacity-50" onClick={()=>setEnable(plan)}>{plan.monthly_available||plan.yearly_available?'Refresh naira checkout':'Enable naira checkout'}</button></div>
 {(plan.monthly_available||plan.yearly_available)&&<p className="mt-3 text-xs text-muted">One-time period passes. Renew manually.</p>}
 </li>)}</ul>{!data.loading&&!data.error&&!data.data?.plans.length&&<p className="text-muted">No plans yet. Create your first plan.</p>}</div>
 <BottomSheet open={Boolean(form)} onClose={close} title={editing?'Edit plan':'Create plan'} footer={<button disabled={busy} onClick={()=>void save()} className={`${primaryButton} w-full`}>{busy?'Saving...':'Save plan'}</button>}>
 {form&&<div className="space-y-4"><Field label="Plan name"><input value={form.display_name} onChange={e=>field('display_name',e.target.value)} className={inputClass} maxLength={100}/></Field><Field label="Plan key" hint="Unique lowercase identifier, for example plus"><input disabled={Boolean(editing)} value={form.plan_key} onChange={e=>field('plan_key',e.target.value)} className={inputClass}/></Field>
 <Field label="For"><select value={form.audience} onChange={e=>field('audience',e.target.value as PlanInput['audience'])} className={inputClass}><option value="consumer">Individuals</option><option value="business">Businesses</option></select></Field>
 <Field label="Tagline"><input value={form.tagline} onChange={e=>field('tagline',e.target.value)} className={inputClass} maxLength={200}/></Field>
 <div className="grid grid-cols-2 gap-3">{(['monthly','yearly'] as const).map(period=><div className="space-y-3" key={period}><Field label={`${period==='monthly'?'Monthly':'Yearly'} price (₦)`}><input type="number" min={0} step="0.01" value={form[`${period}_amount`]} onChange={e=>field(`${period}_amount`,e.target.value)} className={inputClass}/></Field><Field label={`${period==='monthly'?'Monthly':'Yearly'} credits`}><input type="number" min={0} step={1} value={form[`${period}_credits`]} onChange={e=>field(`${period}_credits`,Number(e.target.value))} className={inputClass}/></Field></div>)}</div>
 <Field label="Benefits — one per line" hint="Only list benefits available in the app. Descriptions do not enable extra features."><textarea rows={5} value={benefits} onChange={e=>setBenefits(e.target.value)} className={textareaClass}/></Field>
 <label className="flex items-center justify-between gap-3"><span className="text-ink">Most popular</span><Switch checked={form.is_popular} onChange={value=>field('is_popular',value)} label="Most popular"/></label><p className="text-xs text-muted">Chosen by admin. Publishing a featured plan replaces the previous featured plan for this audience.</p>
 <label className="flex items-center justify-between gap-3"><span className="text-ink">Published</span><Switch checked={form.is_published} onChange={value=>field('is_published',value)} label="Published"/></label>
 <p className="rounded-2xl bg-canvas p-3 text-sm text-muted">All prices are naira. After publishing, enable one-time naira checkout separately. Credits last 30 days or 365 days from payment; renewal is manual. Features such as verification badges still require their normal checks.</p>{error&&<p className="text-sm text-danger" role="alert">{error}</p>}
 </div>}</BottomSheet>
 <ConfirmSheet open={Boolean(enable)} onClose={()=>!busy&&setEnable(null)} onConfirm={()=>void activate()} title="Enable naira checkout?" description="Creates one-time Bachs products at the saved naira prices. Monthly credits expire after 30 days; yearly credits after 365 days. Customers renew manually. This does not enable automatic recurring charges." confirmLabel={busy?'Enabling...':'Enable manual-renewal passes'}/>
 </>;
}
