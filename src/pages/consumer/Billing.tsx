import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Action, ApiState, panelStyle } from '../../components/ApiUI';
import { useApiData } from '../../hooks/useApiData';
import { useUser } from '../../contexts/UserContext';
import { billingApi, type BillingBalance, type BillingCheckout, type BillingOffer } from '../../api/billing';
import { safeHttpUrl } from '../../utils/investigations';
import { retryDelay } from '../../utils/investigationPolling';
import { ApiError } from '../../api/client';
export function Billing() {
    const { session } = useUser();
    const offers = useApiData<{
        enabled: boolean;
        offers: BillingOffer[];
    }>('/v1/billing/offers', false);
    const balance = useApiData<BillingBalance>(session ? '/v1/billing/me' : null);
    const [checkoutId, setCheckoutId] = useState(() => { try {
        return sessionStorage.getItem('pc-checkout-id');
    }
    catch {
        return null;
    } });
    const [checkout, setCheckout] = useState<BillingCheckout | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [revision, setRevision] = useState(0);
    const attempts = useRef(new Map<string, string>());
    const purchaseLock = useRef(false);
    const [purchasing, setPurchasing] = useState(false);
    const balanceRefresh = useRef(balance.refresh);
    balanceRefresh.current = balance.refresh;
    useEffect(() => {
        if (!checkoutId || !session)
            return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        let polls = 0;
        const abort = new AbortController();
        const read = async () => {
            if (document.hidden) {
                timer = setTimeout(() => void read(), 5000);
                return;
            }
            try {
                const result = await billingApi.checkout(checkoutId, abort.signal);
                if (stopped)
                    return;
                setCheckout(result.checkout);
                setError(null);
                balanceRefresh.current();
                polls++;
                if (polls < 60 && !['expired', 'failed', 'refunded'].includes(result.checkout.status))
                    timer = setTimeout(() => void read(), 5000);
            }
            catch (failure) {
                if (stopped)
                    return;
                setError(failure);
                if (!(failure instanceof ApiError && [401, 403, 404].includes(failure.status)))
                    timer = setTimeout(() => void read(), retryDelay(failure, 15000));
            }
        };
        void read();
        return () => { stopped = true; abort.abort(); clearTimeout(timer); };
    }, [checkoutId, session?.id, revision]); // eslint-disable-line react-hooks/exhaustive-deps
    const buy = async (offer: BillingOffer) => {
        if (purchaseLock.current)
            return;
        purchaseLock.current = true;
        setPurchasing(true);
        try {
            let key = attempts.current.get(offer.offer_key);
            if (!key) {
                key = crypto.randomUUID();
                attempts.current.set(offer.offer_key, key);
            }
            const result = await billingApi.create(offer.offer_key, key);
            setCheckout(result.checkout);
            setCheckoutId(result.checkout.billing_checkout_id);
            try {
                sessionStorage.setItem('pc-checkout-id', result.checkout.billing_checkout_id);
            }
            catch { /* Only the non-secret local UUID is retained. */ }
            const url = safeHttpUrl(result.checkout.checkout_url);
            if (result.checkout.status === 'open') {
                if (!url)
                    throw new Error('Checkout URL unavailable. Resume this checkout instead of creating another.');
                window.location.assign(url);
            }
        }
        finally {
            purchaseLock.current = false;
            setPurchasing(false);
        }
    };
    return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10">
    <h1 className="text-2xl font-bold text-ink">Investigation allowances & billing</h1>
    <ApiState loading={offers.loading || balance.loading} error={offers.error || balance.error || error}/>
    {offers.data?.enabled === false && <section className={panelStyle}><p className="text-muted">Billing is unavailable. Paid allowances are not enforced while billing is disabled.</p></section>}
    {offers.data?.enabled && <>
      {balance.data?.enabled && <section className={panelStyle}><h2 className="font-semibold text-ink">Available units: {balance.data.available_units}</h2><p className="text-sm text-muted">One unit per new investigation. Subscription units apply to each paid period; retrying the same failed investigation does not purchase another investigation.</p></section>}
      {offers.data.offers.length === 0 && <p className="text-muted">No offers are configured.</p>}
      <fieldset disabled={purchasing} className="space-y-4">{offers.data.offers.map(offer => <section key={offer.offer_key} className={panelStyle}><h2 className="font-semibold text-ink">{offer.display_name}</h2><p className="text-ink">{offer.currency} {offer.amount} · {offer.investigation_units} units · {offer.billing_mode === 'subscription' ? 'Subscription period allowance' : 'One-time purchase'}</p>{session ? <Action run={() => buy(offer)}>Open secure hosted checkout</Action> : <Link to="/signin" state={{ from: '/account/billing' }} className="text-brand-dark">Sign in to purchase</Link>}</section>)}</fieldset>
    </>}
    {checkoutId && <section className={panelStyle}><h2 className="font-semibold text-ink">Checkout status</h2>{!session ? <Link to="/signin" state={{ from: '/account/billing' }} className="text-brand-dark">Sign in again to check your payment</Link> : <><p className="text-muted">{checkout?.status || 'Checking owned checkout...'}</p><p className="text-sm text-muted">A browser return does not confirm payment. Paid status may precede allowance reconciliation. The backend balance is authoritative.</p><button onClick={() => setRevision(value => value + 1)} className="text-brand-dark">Refresh checkout and balance</button></>}<button onClick={() => { setCheckoutId(null); setCheckout(null); try {
        sessionStorage.removeItem('pc-checkout-id');
    }
    catch { /* Storage unavailable. */ } }} className="block text-sm text-muted">Dismiss checkout status</button></section>}
    {balance.data?.subscriptions.map(sub => <section key={sub.billing_subscription_id} className={panelStyle}><h2 className="font-semibold text-ink">Subscription</h2><p className="text-muted">{String(sub.provider_status || 'Status unavailable')}</p><Action run={async () => { const result = await billingApi.portal(sub.billing_subscription_id); const url = safeHttpUrl(result.url); if (!url)
        throw new Error('Invalid portal URL.'); window.location.assign(url); }}>Manage in provider portal</Action></section>)}
    <p className="text-sm text-muted">Purchase history, invoice downloads, direct plan changes and automatic refunds are unavailable. Payment details are collected only by the hosted provider.</p>
  </div>;
}
export { Billing as Credits };
