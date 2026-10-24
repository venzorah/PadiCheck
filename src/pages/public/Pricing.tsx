import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { PlanPicker } from '../../components/billing/PlanPicker';
import { useUser } from '../../contexts/UserContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import {useApiData} from '../../hooks/useApiData';
import type {BillingPlan} from '../../api/plans';
import {plans as previewPlans,comparisonRows as previewComparison} from '../../data/plans';

export function Pricing() {
  const navigate = useNavigate();
  const { session } = useUser();
  const [audience, setAudience] = useState<'consumer' | 'business'>('consumer');
  const catalog=useApiData<{plans:BillingPlan[]}>('/v1/billing/plans',false);
  const published=(catalog.data?.plans??[]).filter(plan=>plan.audience==='consumer');
  const consumerPlans=published.length?published:previewPlans.filter(plan=>plan.audience==='consumer').map(plan=>({plan_id:'preview:'+plan.id,plan_key:plan.id,display_name:plan.name,monthly_credits:0,features:plan.features}));
  const comparisonRows:{label:string;values:Record<string,string|boolean>}[]=published.length?[{label:'Credits per month',values:Object.fromEntries(consumerPlans.map(plan=>[plan.plan_key,String(plan.monthly_credits)]))},...[...new Set(consumerPlans.flatMap(plan=>plan.features))].map(feature=>({label:feature,values:Object.fromEntries(consumerPlans.map(plan=>[plan.plan_key,plan.features.includes(feature)]))}))]:previewComparison;
  usePageMeta({ title: 'Pricing', description: 'Free, Plus and Pro plans for individuals, and verification plans for businesses.' });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 lg:px-10 lg:pt-16">
      <h1 className="text-center text-4xl font-bold text-ink sm:text-5xl">Simple pricing</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-lg text-ink-soft">Start free. Upgrade when you check often — or verify your business.</p>
      <div role="tablist" aria-label="Plans for" className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1">
        {(['consumer', 'business'] as const).map((a) =>
        <button key={a} type="button" role="tab" aria-selected={audience === a} onClick={() => setAudience(a)} className={`h-11 rounded-xl text-sm font-semibold transition-colors ${audience === a ? 'bg-surface text-ink shadow-card' : 'text-muted'}`}>
            {a === 'consumer' ? 'For individuals' : 'For businesses'}
          </button>
        )}
      </div>
      <div className="mt-8">
        <PlanPicker key={audience} audience={audience} signedIn={Boolean(session)} onRequireSignIn={() => navigate('/signup', { state: { from: '/pricing' } })} />
      </div>

      {audience === 'consumer' && consumerPlans.length>0 &&
      <section aria-labelledby="compare" className="mt-14">
          <h2 id="compare" className="text-2xl font-bold text-ink">Compare plans</h2>
          <div className="mt-4 overflow-x-auto rounded-3xl bg-surface">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-sm text-muted">
                  <th scope="col" className="px-5 py-4 font-medium">Feature</th>
                  {consumerPlans.map(plan=><th key={plan.plan_id} scope="col" className="px-5 py-4 font-medium">{plan.display_name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparisonRows.map((r) =>
              <tr key={r.label}>
                    <th scope="row" className="px-5 py-3.5 font-medium text-ink">{r.label}</th>
                    {consumerPlans.map(plan=>plan.plan_key).map((k) =>
                <td key={k} className="px-5 py-3.5 text-ink">
                        {typeof r.values[k] === 'string' ?
                  r.values[k] :
                  r.values[k] ?
                  <CheckIcon className="h-5 w-5 text-brand" aria-label="Included" /> :

                  <MinusIcon className="h-5 w-5 text-muted" aria-label="Not included" />
                  }
                      </td>
                )}
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </section>
      }
      <p className="mt-8 text-center text-sm text-muted">Prices include VAT. Pay by card, bank transfer or USSD in Naira, or with an international card. Cancel any time.</p>
    </div>);

}
