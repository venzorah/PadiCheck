import {useState} from 'react';
import {CheckIcon} from 'lucide-react';
import {CheckoutSheet} from './CheckoutSheet';
import {useApiData} from '../../hooks/useApiData';
import {ApiState} from '../ApiUI';
import {formatNaira} from '../../utils/checks';
import type {BillingPlan} from '../../api/plans';
import {plans as previews} from '../../data/plans';

interface PlanPickerProps {audience:'consumer'|'business';signedIn:boolean;onRequireSignIn?:()=>void;}
export function PlanPicker({audience,signedIn,onRequireSignIn}:PlanPickerProps){
 const [period,setPeriod]=useState<'monthly'|'yearly'>('monthly');const [checkout,setCheckout]=useState<BillingPlan|null>(null);
 const catalog=useApiData<{plans:BillingPlan[];billing_enabled:boolean}>('/v1/billing/plans',false);
 const saved=(catalog.data?.plans??[]).filter(plan=>plan.audience===audience);
 const list:BillingPlan[]=saved.length?saved:previews.filter(plan=>plan.audience===audience).map(plan=>({plan_id:'preview:'+plan.id,plan_key:plan.id,audience:plan.audience,display_name:plan.name,tagline:plan.tagline,currency:'NGN',monthly_amount:plan.monthly.toFixed(2),yearly_amount:plan.yearly.toFixed(2),monthly_credits:0,yearly_credits:0,features:plan.features,is_popular:Boolean(plan.highlight),is_published:false,revision:0}));
 const available=(plan:BillingPlan)=>Boolean(catalog.data?.billing_enabled&&plan[`${period}_available`]&&plan[`${period}_offer_key`]);
 const choose=(plan:BillingPlan)=>{if(!signedIn){onRequireSignIn?.();return;}if(available(plan))setCheckout(plan);};
 return <div><ApiState loading={catalog.loading} error={catalog.error}/>
 <div role="radiogroup" aria-label="Billing period" className="mx-auto grid w-full max-w-xs grid-cols-2 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">{(['monthly','yearly'] as const).map(value=><button key={value} type="button" role="radio" aria-checked={period===value} onClick={()=>{setPeriod(value);setCheckout(null);}} className={`h-11 rounded-xl text-sm font-semibold transition-colors ${period===value?'bg-brand text-white':'text-ink-soft'}`}>{value==='monthly'?'Monthly':'Yearly'}</button>)}</div>
 <ul className="mt-6 grid gap-4 md:grid-cols-3">{list.map(plan=>{const price=Number(plan[`${period}_amount`]);const units=plan[`${period}_credits`];return <li key={plan.plan_id} className={`flex flex-col rounded-3xl bg-surface p-6 ${plan.is_popular?'ring-2 ring-brand':'ring-1 ring-line'}`}>
 <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-ink">{plan.display_name}</h3>{plan.is_popular&&<span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">Most popular</span>}</div>
 <p className="mt-1 text-sm text-muted">{plan.tagline}</p><p className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold tracking-tight text-ink">{price?formatNaira(price):'Free'}</span>{price>0&&<span className="text-muted">/{period==='monthly'?'month':'year'}</span>}</p>
 <ul className="mt-5 space-y-2.5">{[...(units>0?[`${units} credits per ${period==='monthly'?'month':'year'}`]:[]),...plan.features].map(feature=><li key={feature} className="flex gap-2 text-[15px] text-ink-soft"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={3} aria-hidden="true"/>{feature}</li>)}</ul>
 <div className="mt-auto pt-6"><button type="button" onClick={()=>choose(plan)} disabled={signedIn&&!available(plan)} className={`inline-flex h-12 w-full items-center justify-center rounded-2xl font-semibold transition-colors disabled:opacity-60 ${plan.is_popular?'bg-brand text-white hover:bg-brand-dark':'text-ink ring-1 ring-line hover:bg-canvas'}`}>{!signedIn?(price?'Get started':'Start free'):available(plan)?`Buy ${period==='monthly'?'30':'365'}-day pass`:price?'Not available for purchase':'Free account'}</button>{available(plan)&&<p className="mt-2 text-center text-xs text-muted">One-time naira payment. Renew manually.</p>}</div>
 </li>;})}</ul>
 {!catalog.loading&&!catalog.error&&!list.length&&<p className="mt-6 text-center text-muted">No published plans available yet.</p>}
 <CheckoutSheet open={Boolean(checkout)} onClose={()=>setCheckout(null)} title={`${checkout?.display_name??''} · ${period==='monthly'?'30':'365'} days`} description={`One-time naira payment for ${period==='monthly'?'30':'365'} days of credits. Credits expire at the end of the period. Renew manually; there are no automatic recurring charges.`} amountNaira={checkout?Number(checkout[`${period}_amount`]):0} offerKey={checkout?.[`${period}_offer_key`]??undefined} onPaid={()=>undefined}/>
 </div>;
}
