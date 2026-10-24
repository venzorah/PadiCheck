# Bachs sandbox through ngrok

Use the existing frontend tunnel, which forwards `/v1` through Vite to the backend. No Vite changes or second tunnel are needed.

```text
Public origin: https://jean-unprospering-numerically.ngrok-free.dev
Tunnel upstream: http://localhost:5713
Backend: http://127.0.0.1:3000
Webhook destination: https://jean-unprospering-numerically.ngrok-free.dev/v1/webhooks/bachs
```

## 1. Keep services running

Start the backend and Vite as usual. The existing tunnel can be started with:

```powershell
ngrok http http://localhost:5713 --url=jean-unprospering-numerically.ngrok-free.dev
```

If ngrok is already running with this domain, leave that process running. Do not start a duplicate endpoint. Keep the computer and all three processes running throughout the test. If the domain changes, update Bachs's endpoint and return URLs; update the frontend allowed host and Google sign-in origin as appropriate.

## 2. Configure Bachs

Sign into [Bachs](https://app.bachs.io/) and select the **sandbox/test environment**. In **Developer Portal → Webhooks → Add destination**, register the webhook URL above. Our application route is `/v1/webhooks/bachs`.

Subscribe to the events the backend handles:

```text
checkout.completed
checkout.expired
collection.succeeded
collection.failed
collection.underpaid
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
```

Open the saved destination and copy its signing secret privately. Obtain the merchant sandbox API key and merchant organization/account identifier (`acct_...`) from your Bachs account. Use the same merchant and environment for all credentials and products. Dashboard access must permit managing webhooks; see [Bachs's official webhook setup guide](https://docs.bachs.io/guides/webhooks/overview).

## 3. Configure the backend as a complete group

Edit **`C:\Users\HP\Desktop\projects\padicheck\.env`**, not the frontend environment. Replace the three placeholders privately. Do not commit the real `.env` or paste credentials into chat.

```dotenv
BACHS_ENVIRONMENT=sandbox
BACHS_API_KEY=REPLACE_WITH_YOUR_sk_sandbox_KEY
BACHS_WEBHOOK_SECRET=REPLACE_WITH_ENDPOINT_SIGNING_SECRET
BACHS_ORGANIZATION_ID=REPLACE_WITH_YOUR_acct_ID
BACHS_SUCCESS_URL=https://jean-unprospering-numerically.ngrok-free.dev/billing/return
BACHS_CANCEL_URL=https://jean-unprospering-numerically.ngrok-free.dev/billing/cancel
BILLING_ENABLED=false
```

The backend rejects partial Bachs configuration, even when billing is disabled. Save the complete group before restarting. Never use a production/live key for this sandbox test.

## 4. Map credit packages

Create the intended sandbox products in Bachs. Each PadiCheck billing offer needs its real `prod_...` ID, name, price, currency, one-time/subscription mode, and number of credits awarded. The existing superadmin API `POST /v1/admin/billing/offers` supports these mappings. Product ID, amount, currency and mode must match Bachs; the server stores the credit quantity. Do not invent product IDs or prices.

One-time offers support the implemented USD/NGN contract. Subscription support currently expects USD. Follow the backend `docs/payments.md` contract and verify the current provider product restrictions before live use.

## 5. Acceptance

After credentials and package mappings are validated, enable the intended offer and set `BILLING_ENABLED=true`, then restart the backend for a sandbox checkout and signed webhook test. Webhooks are rejected with `503 billing_unavailable` while billing is disabled. An unsigned request must be rejected once enabled; do not relax signature verification to make a test pass.

Complete a sandbox checkout with your own signed-in test account. Bachs delivers the signed event; the backend verifies it, retrieves current provider state, and grants the configured credits once. A browser success redirect does not award credits. Confirm credit balance/activity, duplicate delivery handling, and a subsequent check at the admin-defined price.

`CREDITS_ENABLED=true` activates the separate admin-controlled per-category pricing and signup bonus feature. Configure that policy before enabling it. If only legacy `BILLING_ENABLED` is active, new investigations cost one unit; this is separate from the new admin-defined pricing mode.

## Validation on 24 October 2026

- Started the existing ngrok domain pointing to port 5713.
- Public `/ready` returned 200.
- A non-event unsigned POST reached `/v1/webhooks/bachs` and returned the expected disabled-billing 503, without processing a payment.
- All five required Bachs credential/return-URL fields were unset at inspection. No provider checkout or signed-delivery acceptance has been performed yet.

## Sandbox setup completed afterward

The operator supplied sandbox credentials; read-only product and endpoint requests returned 200. The sandbox catalog and endpoint list were initially empty. A sandbox destination was registered at the ngrok webhook URL with the nine subscriptions above, and its signing secret was saved directly in the backend environment without printing it. The organization ID was corrected from an own-account sandbox event: connected-account envelopes were excluded.

The requested NGN 20 package was rejected by Bachs with `price: amount must be at least 100.00 NGN`. The user then explicitly selected **Demo, NGN 100, 10 credits**. That one-time sandbox product and matching enabled local offer (`offer_key=demo`) were created. The local offer setup was recorded as `billing.offers.operator_setup`, with a null system actor and the user's approved terms; no user role or session was fabricated.

`BILLING_ENABLED=true` was saved for sandbox and the API restarted. Local and public readiness and public offer retrieval returned 200; the public offer is NGN 100 for 10 credits. An unsigned webhook request returned 400 `invalid_webhook`. No checkout or webhook inbox entry existed at the end of these preflight checks.

**Pending:** the user must open `/credits`, sign in, select Demo, and open Bachs checkout. Provider-signed payment delivery, exact credit award, replay deduplication and post-payment balance acceptance remain unverified until that sandbox checkout is completed. `CREDITS_ENABLED` remains false; this test has not chosen or activated a welcome bonus or changed the administrator's per-category policy.

### First checkout connection issue

The first browser attempt returned `billing_provider_failed`. The agent-started API process lacked outbound network access (`EACCES`); a sandbox read-only diagnostic failed in that same restricted execution context. Retrying the original saved checkout with its unchanged request/idempotency keys from an allowed context returned provider POST 201 and GET 200 and saved the existing checkout as open. The API was then restarted with outbound network access. No payment was submitted by the diagnostic and no second local checkout was created. Subsequent agent-started API processes need the same network access for Bachs creation and webhook reconciliation.

### Successful payment and session return

The user completed the sandbox payment. Both `checkout.completed` and `collection.succeeded` were processed, with one 10-credit grant. Refreshing after the external checkout initially lost the in-memory login; [browser-session restoration](browser-sessions.md) fixed that issue. The user confirmed protected-page refresh, a new account tab, continued sign-in and the 10-credit balance. Explicit provider-event replay remains a separate optional acceptance check; it was not performed in this pass.
