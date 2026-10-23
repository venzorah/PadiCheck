import { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon } from 'lucide-react';
import { CheckoutSheet } from './CheckoutSheet';
import { ConfirmSheet } from '../ConfirmSheet';
import { useTrust } from '../../contexts/TrustContext';
import { useApiData } from '../../hooks/useApiData';
import type { BillingOffer } from '../../api/billing';
import { ApiState } from '../ApiUI';
import { plans, type Plan } from '../../data/plans';
import { formatNaira } from '../../utils/checks';

interface PlanPickerProps {
  audience: 'consumer' | 'business';
  /** When false, buttons route visitors to sign up instead of opening checkout. */
  signedIn: boolean;
  onRequireSignIn?: () => void;
}

/** Plan cards with monthly/yearly toggle, upgrade/downgrade and checkout. Shared by Pricing, Billing and the Business portal. */
export function PlanPicker({ audience, signedIn, onRequireSignIn }: PlanPickerProps) {
  const { subscription, addInvoice } = useTrust();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>(subscription.period);
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [downgrade, setDowngrade] = useState<Plan | null>(null);
  const offers=useApiData<{enabled:boolean;offers:BillingOffer[]}>('/v1/billing/offers',false);
  const list=plans.filter(p=>p.audience===audience);
  const offerFor=(plan:Plan)=>offers.data?.offers.find(offer=>offer.offer_key===plan.id||offer.display_name.toLowerCase()===plan.name.toLowerCase());
  const currentIndex = plans.findIndex((p) => p.id === subscription.planId);

  const choose = (p: Plan) => {
    if (!signedIn) return onRequireSignIn?.();
    if(!offers.data?.enabled||!offerFor(p))return;
    setCheckout(p);
  };

  return (
    <div><ApiState loading={offers.loading} error={offers.error}/>{offers.data?.enabled===false&&<p className="mb-4 text-sm text-muted">Billing is currently unavailable. Plans below are not available for purchase.</p>}
      <div role="radiogroup" aria-label="Billing period" className="mx-auto grid w-full max-w-xs grid-cols-2 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
        {(['monthly', 'yearly'] as const).map((p) =>
        <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} className={`h-11 rounded-xl text-sm font-semibold transition-colors ${period === p ? 'bg-brand text-white' : 'text-ink-soft'}`}>
            {p === 'monthly' ? 'Monthly' : 'Yearly · save 17%'}
          </button>
        )}
      </div>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {list.map((p) => {
          const price = offerFor(p) ? Number(offerFor(p)!.amount) : period === 'monthly' ? p.monthly : p.yearly;
          const current = signedIn && p.id === subscription.planId && subscription.status === 'active';
          return (
            <li key={p.id} className={`flex flex-col rounded-3xl bg-surface p-6 ${p.highlight ? 'ring-2 ring-brand' : 'ring-1 ring-line'}`}>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                {p.highlight && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">Most popular</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-ink">{price ? formatNaira(price) : 'Free'}</span>
                {price > 0 && <span className="text-muted">/{period === 'monthly' ? 'month' : 'year'}</span>}
              </p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) =>
                <li key={f} className="flex gap-2 text-[15px] text-ink-soft">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" /> {f}
                  </li>
                )}
              </ul>
              <div className="mt-auto pt-6">
              <button
                  type="button"
                  onClick={() => choose(p)}
                  disabled={!offers.data?.enabled||!offerFor(p)}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-2xl font-semibold transition-colors disabled:opacity-60 ${
                  p.highlight ? 'bg-brand text-white hover:bg-brand-dark' : 'text-ink ring-1 ring-line hover:bg-canvas'}`
                  }>
                  
                {current ? period === subscription.period ? 'Current plan' : `Switch to ${period}` : !signedIn ? price ? 'Get started' : 'Start free' : plans.findIndex((x) => x.id === p.id) < currentIndex && plans[currentIndex]?.audience === audience ? 'Downgrade' : 'Upgrade'}
              </button>
              </div>
            </li>);

        })}
      </ul>

      <CheckoutSheet
        open={checkout !== null}
        onClose={() => setCheckout(null)}
        title={`${checkout?.name ?? ''} · ${period}`}
        description="You can cancel any time. Your plan renews automatically until you do."
        amountNaira={checkout ? period === 'monthly' ? checkout.monthly : checkout.yearly : 0}
        offerKey={checkout?offerFor(checkout)?.offer_key:undefined}
        onPaid={()=>undefined} />
      
      <ConfirmSheet
        open={downgrade !== null}
        onClose={() => setDowngrade(null)}
        onConfirm={()=>{toast('Manage your subscription through the provider portal in Billing.');setDowngrade(null);}}
        title={`Downgrade to ${downgrade?.name}?`}
        description="You keep your current features until the end of this billing period. Nothing is refunded for the remaining time."
        confirmLabel="Downgrade" />
      
    </div>);

}