import { api } from './client';
export interface BillingOffer {
    offer_key: string;
    display_name: string;
    billing_mode: 'one_time' | 'subscription';
    currency: string;
    amount: string;
    investigation_units: number;
}
export interface BillingCheckout {
    billing_checkout_id: string;
    status: string;
    checkout_url: string | null;
    [key: string]: unknown;
}
export interface BillingSubscription {
    billing_subscription_id: string;
    status: string;
    [key: string]: unknown;
}
export interface BillingBalance {
    enabled: boolean;
    available_units: string | number;
    subscriptions: BillingSubscription[];
}
export const billingApi = {
    create: (offer_key: string, request_key: string) => api<{
        checkout: BillingCheckout;
    }>('/v1/billing/checkouts', { auth: true, method: 'POST', json: { offer_key, request_key } }),
    checkout: (id: string, signal?: AbortSignal) => api<{
        checkout: BillingCheckout;
    }>(`/v1/billing/checkouts/${encodeURIComponent(id)}`, { auth: true, signal }),
    portal: (billing_subscription_id: string) => api<{
        url: string;
    }>('/v1/billing/portal', { auth: true, method: 'POST', json: { billing_subscription_id } }),
};
