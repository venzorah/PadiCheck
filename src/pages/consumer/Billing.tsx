import { useState } from 'react';
import { toast } from 'sonner';
import { useApiData } from '../../hooks/useApiData';
import { billingApi, type BillingBalance, type BillingHistory, type BillingHistoryEntry } from '../../api/billing';
import {billingAmount} from '../../utils/billingHistory';
import { apiErrorMessage } from '../../api/client';
import { safeHttpUrl } from '../../utils/investigations';
import { CheckoutStatus } from '../../components/billing/CheckoutStatus';
import { ApiState } from '../../components/ApiUI';
import { ReceiptIcon } from 'lucide-react';
import { BottomSheet } from '../../components/BottomSheet';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { PlanPicker } from '../../components/billing/PlanPicker';
import { PageHeader } from '../../components/consumer/PageHeader';
import { useTrust } from '../../contexts/TrustContext';
import { planById } from '../../data/plans';
import { formatDate, formatNaira } from '../../utils/checks';

const invoiceTone = { paid: 'bg-brand-soft text-brand-dark', failed: 'bg-danger-soft text-danger', refunded: 'bg-canvas text-muted' };

export function Billing() {
  const { subscription } = useTrust();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receipt, setReceipt] = useState<BillingHistoryEntry | null>(null);
  const [historyOffset,setHistoryOffset]=useState(0);
  const history=useApiData<BillingHistory>(`/v1/billing/history?limit=20&offset=${historyOffset}`);
  const invoices=history.data?.entries??[];
  const balance=useApiData<BillingBalance>('/v1/billing/me');
  const active=balance.data?.subscriptions[0];
  const plan={...planById(subscription.planId)!,name:balance.data?.enabled?String(active?.display_name||active?.offer_key||'Investigation allowances'):'Billing unavailable'};
  const manage=async()=>{if(!active)return;try{const result=await billingApi.portal(active.billing_subscription_id);const url=safeHttpUrl(result.url);if(!url)throw new Error('Portal URL is unavailable.');window.location.assign(url);}catch(error){toast.error(apiErrorMessage(error));}};
  const paid = !!active;

  return (
    <>
      <PageHeader title="Subscription & billing" back="/account" />
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pb-10 lg:px-10">
        <ApiState loading={balance.loading} error={balance.error}/><CheckoutStatus onPaid={()=>{history.refresh();balance.refresh();}}/><section aria-labelledby="current-heading" className="rounded-3xl bg-surface p-5 md:p-6">
          <h2 id="current-heading" className="text-sm font-medium text-muted">
            Current plan
          </h2>
          <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="flex-1">
              <p className="text-3xl font-bold text-ink">{plan?.name ?? 'Free'}</p>
              <p className="mt-1 text-ink-soft">
                {subscription.status === 'cancelled' ?
                `Cancelled — access until ${formatDate(subscription.renewsAt)}` :
                paid ?
                `${formatNaira(subscription.period === 'monthly' ? plan.monthly : plan.yearly)} / ${subscription.period === 'monthly' ? 'month' : 'year'} · renews ${formatDate(subscription.renewsAt)}` :
                balance.data?.enabled ? 'Available units: '+balance.data.available_units : 'Paid allowances are not enforced while billing is disabled'}
              </p>
            </div>
            {paid && subscription.status === 'active' &&
            <button type="button" onClick={() => setCancelOpen(true)} className="h-11 rounded-xl px-4 text-sm font-semibold text-danger ring-1 ring-line hover:bg-danger-soft">
                Cancel plan
              </button>
            }
            {subscription.status === 'cancelled' &&
            <button
              type="button"
              onClick={()=>void manage()}
              className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
              
                Resume plan
              </button>
            }
          </div>
        </section>

        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-4 text-xl font-bold text-ink">
            Change plan
          </h2>
          <PlanPicker audience="consumer" signedIn />
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-xl font-bold text-ink">
            Billing history
          </h2>
          <ApiState loading={history.loading} error={history.error}/>
          <button type="button" onClick={history.refresh} disabled={history.loading} className="mt-2 text-sm font-semibold text-brand-dark">Refresh history</button>
          <table className="mt-3 w-full overflow-hidden rounded-3xl bg-surface text-left">
            <caption className="sr-only">Payments and invoices</caption>
            <thead className="hidden text-sm text-muted md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Date</th>
                <th scope="col" className="px-5 py-3 font-medium">Description</th>
                <th scope="col" className="px-5 py-3 font-medium">Amount</th>
                <th scope="col" className="px-5 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Receipt</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((i) =>
              <tr key={i.id} className="flex flex-wrap items-center gap-x-3 px-5 py-3 md:table-row md:px-0">
                  <td className="w-full text-sm text-muted md:w-auto md:px-5 md:py-3">{formatDate(i.at)}</td>
                  <td className="flex-1 font-medium text-ink md:px-5 md:py-3">{i.description}</td>
                  <td className="font-semibold text-ink md:px-5 md:py-3">{billingAmount(i.amount,i.currency)}</td>
                  <td className="md:px-5 md:py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${invoiceTone[i.status]}`}>{i.status}</span>
                  </td>
                  <td className="md:px-5 md:py-3">
                    <button type="button" onClick={() => setReceipt(i)} aria-label={`View receipt ${i.id}`} className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink">
                      <ReceiptIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              )}
              {!history.loading&&!history.error&&invoices.length===0&&<tr><td colSpan={5} className="px-5 py-6 text-sm text-muted">No billing records yet.</td></tr>}
            </tbody>
          </table>
          {(historyOffset>0||history.data?.has_more)&&<div className="mt-3 flex justify-between gap-3"><button type="button" disabled={historyOffset===0||history.loading} onClick={()=>setHistoryOffset(value=>Math.max(0,value-20))} className="h-11 rounded-xl px-4 font-semibold text-ink ring-1 ring-line disabled:opacity-50">Previous</button><button type="button" disabled={!history.data?.has_more||history.loading} onClick={()=>setHistoryOffset(value=>value+20)} className="h-11 rounded-xl px-4 font-semibold text-ink ring-1 ring-line disabled:opacity-50">Next</button></div>}
        </section>
      </div>

      <ConfirmSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={()=>void manage()}
        title="Cancel your plan?"
        description="Manage cancellation and renewal in the secure payment-provider portal."
        confirmLabel="Cancel plan"
        tone="danger" />
      
      <BottomSheet open={receipt !== null} onClose={() => setReceipt(null)} title={receipt?.kind==='invoice'?'Invoice details':'Payment details'}>
        {receipt &&
        <div>
            <dl className="divide-y divide-line rounded-2xl bg-canvas text-sm">
              {[
            ['Date', formatDate(receipt.at)],
            ['Description', receipt.description],
            ['Payment provider', 'Bachs'],
            ['Reference', receipt.reference??'Unavailable'],
            ['Amount', billingAmount(receipt.amount,receipt.currency)],
            ['Credits in package', String(receipt.credits)],
            ['Status', receipt.status]].
            map(([k, v]) =>
            <div key={k} className="flex justify-between gap-4 p-3.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-ink">{v}</dd>
                </div>
            )}
            </dl>
            <button type="button" onClick={() => window.print()} className="mt-4 h-12 w-full rounded-2xl font-semibold text-ink ring-1 ring-line">
              Print payment record
            </button>
          </div>
        }
      </BottomSheet>
    </>);

}
