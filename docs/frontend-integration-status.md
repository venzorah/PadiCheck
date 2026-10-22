# Frontend integration handoff

22 October 2026, Africa/Lagos. References: backend `frontend-ai-integration.md`, `frontend-integration.md`, `platform-extension.md`, `api-reference.md`, `openapi.json`, `payments.md`; contract dated 21 October 2026.

Supported frontend workflows are implemented in the existing React/Vite application. The backend is now running and public live checks pass. Authenticated/provider acceptance remains in progress. No backend source/schema was changed, database reset, or backend environment secrets read/copied.

## Implemented screens and changed files

These groups describe work across the task, including files already committed during the session, rather than only the current uncommitted diff.

| Area | Main files | Implemented behavior/API methods |
| --- | --- | --- |
| Auth | `src/api/auth.ts`, `client.ts`, `src/utils/authFlow.ts`, `src/contexts/UserContext.tsx`, `src/pages/consumer/SignIn.tsx`, `src/pages/auth/MfaLogin.tsx`, `src/App.tsx` | Password and Google share the session/MFA response branch. Public MFA verification precedes `/auth/me`; pending challenges grant no access. OTP registration remains pending until verification. Memory-only credentials, expiry/current-token 401 cleanup; arbitrary 403 does not log out. |
| Security | `src/api/security.ts`, `src/pages/consumer/Security.tsx` | Session GET/DELETE/logout-all; MFA status/setup/confirm/disable/recovery regeneration. Local QR; one-time recovery completion survives forced sign-out. Real legacy-account email verification and Google linking. |
| Investigations/media | Existing investigation/media clients and hooks, `CheckFlow.tsx`, `Result.tsx`, `History.tsx`, `src/components/EvidenceUpload.tsx`, `PrivateMediaLink.tsx` | Real IDs/status/findings/sources/model runs, own cursor history, offset evidence pages, create/cancel/retry, private PDF uploads/fresh delivery URLs. No local charging or synthetic completion; 402 points to Billing. |
| Saved/notifications | `src/api/bookmarks.ts`, `notifications.ts`, `Saved.tsx`, `src/pages/trust/Notifications.tsx`, account `NotificationSheet.tsx`, unread hook/navigation | Investigation bookmark POST/DELETE/list, notification list/read/preferences. Only three documented in-app event types; related IDs, no invented total or email/push delivery. |
| Directory/submissions | `src/api/directory.ts`, `src/pages/public/Directory.tsx`, `BusinessProfile.tsx`, `src/pages/trust/Submissions.tsx`, report/verification/dispute wrappers | Published directory name/category search and exact IDs; moderated allegations, own incident reports, verification/claim requests, disputes, details/evidence/withdrawal. AI findings, allegations and staff decisions remain separate. |
| Business teams | `src/api/businessTeams.ts`, business `BusinessTeam.tsx`, `BusinessProfileEdit.tsx`, `BusinessDashboard.tsx`, `BusinessLayout.tsx` | Real selected business IDs, team list/invite/revoke/role/remove, matching-email invitation acceptance, profile description/category PATCH. Known viewer invitation hides editing; backend checks authorization. No fake invitation email. |
| API keys/developer | `src/api/apiKeys.ts`, developer `DevKeys.tsx`, `DevDocs.tsx`, `DevOverview.tsx`, unavailable developer screens | User-JWT key create/list/rotate/revoke, limited investigation scopes, one-time secret display. Browser does not adopt generated keys. Server examples use supported investigation APIs and `X-API-Key` alone. |
| Billing | `src/api/billing.ts`, consumer `Billing.tsx`, `Credits.tsx`, billing `CheckoutSheet.tsx`, `PlanPicker.tsx`, public Pricing/business billing wrappers | Offers/balance/subscriptions, hosted checkout `{offer_key,request_key}`, same-key explicit retry, owned status/balance polling, fresh portal URL. Disabled state hides purchase controls; redirects never grant units. Only local checkout UUID survives return navigation. |
| Sharing | `src/components/InvestigationSharing.tsx`, `src/pages/public/SharedInvestigation.tsx` | Completed-owner create/list/revoke with acknowledgement/TTL. One-time fragment URL, anonymous token-body resolve, fragment removal and deliberate retry. Public sources only; no private-media delivery. |
| Staff | `src/pages/admin/StaffWorkspace.tsx`, `src/utils/reviewTransitions.ts`, `src/components/ResourceUI.tsx`, `ApiUI.tsx`, `src/data/apiForms.json`, legacy admin auth/shell boundaries | Normal JWT/MFA and `/me` permissions. Business create/update/publication; report/verification/dispute review; roles/grants; six AI registries and agent-tools; billing offers/events/grant revocation; readiness. Contract-derived writable fields, review transitions/self-review restrictions; credential references rather than secrets. |
| Privacy/PWA | `src/utils/privateState.ts`, `serviceWorker.ts`, `shareInbox.ts`, `vite.config.ts`, account boundary | Account changes remount private screens. Old private browser records/caches removed. `/v1`, authorized requests and signed/query downloads remain network-only. Shared files are transient worker memory, consumed once/expired. Workers actually served/emitted. |
| Prototype removal | `TrustContext.tsx`, `AdminSessionContext.tsx`, `src/utils/trustApi.ts`, unsupported pages, `src/data/marketing.ts`, Landing/HowItWorks/HelpCentre, Account/Legal | Reachable supported screens use APIs instead of seed entities/client staff elevation. Unsupported actions have no simulated success. Fake scores/testimonials/payment promises removed from refreshed marketing/help. Static legal documents remain editorial policy text, not a CMS or legal review. |
| Tests/docs | `tests/platform.test.mjs`, existing tests, `scripts/browser-smoke.mjs`, `scripts/browser-platform-mocked.mjs`, README, this file, `.gitignore` | Request/auth/privacy regressions and reproducible handoff; isolated browser profile ignored under `.tmp/`. |

## Verification

Final checks on 22 October 2026:

| Command/check | Result | Scope |
| --- | --- | --- |
| `npm.cmd run test:api` | **29 passed, 0 failed** | Mocked HTTP/auth/media/investigation/security/bookmark/notification/team/key/checkout contracts, review transitions, service-worker/privacy cleanup. |
| `npm.cmd run build` | **Passed**, 2,449 modules; both service workers emitted | Production compilation; Vite itself does not type-check. |
| `.\node_modules\.bin\tsc.cmd --noEmit --noUnusedLocals false --noUnusedParameters false` | **Passed** | Semantic type check excluding historical unused declarations/imports. Not a claim that unrestricted `tsc --noEmit` passes. |
| ESLint on current changed JS/TS sources plus new review helper | **0 errors, 8 warnings** | Fast-refresh boundary/non-null assertions. Repository-wide lint is not claimed clean. |
| `node scripts/browser-platform-mocked.mjs` | **12 checks passed**, no unexpected requests/runtime exceptions | Synthetic fixtures: MFA stop/wrong/valid branch, no client role elevation, bookmark, local QR/enrollment/recovery forced signout, no credential persistence, two-account isolation, one-time API key/navigation, logout-all. Not live account/provider acceptance. |
| `node scripts/browser-smoke.mjs --backend-unavailable` | **9 routes plus privacy check passed**, zero runtime exceptions | Real frontend/backend stopped: welcome, pricing/directory/share errors, sign-in, staff/Saved redirects, missing MFA challenge, developer docs, fragment cleanup; zero `/v1` cache entries and old private-state removal. |

The initial final-continuation smoke run used live-backend expectations and failed for backend-dependent pages because the server was stopped. A cold welcome load also exceeded its old nine-second wait. The script now allows 30 seconds and has an explicit backend-unavailable mode. Those failures are not recorded as successful live acceptance.

Browser scripts need a separately launched isolated Chromium debugging instance and Vite; see README. Fixtures use synthetic credentials only. No real user account/email/staff record was created or modified in these checks.

## Live evidence and current blocker

Earlier in this integration session, while the backend was running:

- `/health` and `/ready` returned 200; jobs/media/email/Google were **configured**, platform extensions **enabled**, research **disabled**, billing **disabled**. Configuration flags do not prove delivery or worker liveness.
- Live `/docs/json` contained **115 operations**, matching the reference operation set.
- Offers returned 200 with `enabled:false`; directory returned an empty 200 page.
- Unauthenticated sessions/MFA/bookmarks/notifications/preferences/keys/invitations returned 401 as expected.
- Invalid anonymous share returned 404; browser removed the fragment and displayed unavailable.

At final continuation, probes to `http://127.0.0.1:3000`, including `/health` and `/ready`, returned **ECONNREFUSED**. Retry outside the sandbox confirmed it. Current configuration cannot be asserted from the earlier snapshot. Restart the API and recheck readiness before live acceptance. No backend process was started or database reset during this final continuation.

## Live testing resumed: 22 October 2026

The backend-unreachable blocker above is resolved. Fresh `/health` and `/ready` return 200. Readiness reports jobs/media/email/Google configured, platform extensions enabled, research and billing disabled. Live `/docs/json` still matches all 115 reference operations.

`node scripts/browser-smoke.mjs` passed all nine live routes plus the privacy check, with no runtime exceptions and zero `/v1` cache entries. Protected auth/MFA/bookmark/notification/preference/invitation/key/billing/investigation/staff probes returned 401 with request IDs. Google challenge POST returned 200 with nonce/expiry (neither credential nor nonce logged). This does not establish Google consent/login acceptance.

User-driven signup returned 202, but the user reported no OTP. No local OTP worker process was running. Started `npm.cmd run email:worker:dev` in the backend directory without editing its files/config. Its sandboxed startup failed; outside the sandbox it logged **OTP email worker ready**, skipped a stale job, and logged **result: sent** for the current job. SMTP acceptance is confirmed; inbox receipt and completed signup are awaiting the user. The user enters their password and code directly in the isolated interactive browser; neither is read/logged by the test harness.

Fixed a local testing issue in `vite.config.ts`: Vite now ignores `**/.tmp/**`, preventing browser-profile HTML writes from refreshing the app and erasing memory-only signup/session state. Production build passed again after this change. Added `scripts/cdp.mjs` and `scripts/browser-live-account.mjs` for credential-free output from user-assisted live account checks. The account suite is not yet recorded as passed.

The separate interactive browser uses debugging port 9228; smoke tests use port 9227. Live account tests create a labelled temporary API key, rotate it and revoke the replacement, preserve the user session and do not enable MFA or grant staff roles. They must run only against an explicitly authorized test account.

### OTP delivery remains blocked downstream

The user confirmed no email arrived in inbox or spam after SMTP acceptance. The worker's `sent` result therefore establishes SMTP handoff only; inbox delivery/signup/authenticated tests have **not passed**. No API key was created by the waiting account suite.

Sanitized configuration metadata identified the real SMTP host and sender domain as `kmconsulting.ng`, implicit TLS on port 465 with authentication configured. No credential values were printed. The UI recipient matches the authorized test email. PowerShell DNS resolution returned an SPF TXT record (`v=spf1 ...`) at `_dmarc.kmconsulting.ng`, without a DMARC policy. A DMARC record uses `v=DMARC1`; see [RFC 7489](https://www.rfc-editor.org/rfc/rfc7489.html). This is an email-authentication configuration defect, **not proof of the reason this particular email is missing**. Gmail's [sender guidelines](https://support.google.com/mail/answer/81126?hl=en) describe SPF/DKIM requirements and DMARC recommendations. Node's DNS resolver failed locally even outside the sandbox; the reported TXT evidence came from successful `Resolve-DnsName` queries.

Next required evidence: sender-hosting delivery/queue logs for the latest signup email, including Gmail acceptance, deferral or bounce reason. The user was asked to check hosting “Track Delivery” or ask their administrator; no hosting/DNS changes were attempted. Keep the OTP worker running alongside the API, then request a fresh code after the delivery issue is resolved. Codes still expire ten minutes from their request.

An additional browser check found **no configured frontend Google button** (`Continue with Google` absent), despite the working backend challenge endpoint. The public matching `VITE_GOOGLE_CLIENT_ID` and exact authorized frontend origin must be configured before Google browser acceptance. The Vite production build passed after the watcher fix; both new live-test scripts pass `node --check`.

## Missing contracts and unavailable features

- **Business discovery:** no `/v1/me/businesses`. Team/profile pages need an actual ID from directory/invitations/verification records, without fixture ownership.
- **Hidden profile read:** edit currently loads published directory details. No documented private profile GET loads a hidden listing for its owner/editor. It cannot be prefilled through this workflow without a backend read/discovery contract.
- Research execution and payment checkout cannot pass acceptance while disabled; last observed disabled states do not fabricate completion/payment.
- Password reset/change, personal profile editing, Google unlink, account export/deletion have no supported API.
- No Trust Scores/bands/alerts, certificates/public certificate QR, customer reviews/responses, analytics, authoritative identity/registration/phone-owner/property-title verification.
- PDF-only investigation attachments: no image/camera/screenshot/DOCX/TXT/audio/video analysis. Storage support does not imply analysis support. No bulk submission, PDF export, server history search/filter/sort; search describes loaded-page scope.
- Notifications/invitations are in-app only; no email/push or arbitrary event kinds.
- No customer webhook subscriptions, request logs, usage/quota plans, isolated sandbox, `/verify/*` or `/risk-score/*` developer APIs.
- No marketplace/hiring/candidate matching, offline private reports/replay, invented invoices, direct refunds/plan changes or failed-investigation recredits.
- No staff user search/suspension, audit listing, CMS/support-ticket backend or arbitrary local credit adjustment. Legacy prototype source may remain but is not routed as functional authority.

## Remaining live acceptance

Start the API and needed email/investigation workers, then recheck `/health`, `/ready` and `/docs/json`. With explicit test accounts:

1. Real mailbox OTP delivery, leading zero, invalid/expired/exhausted codes, duplicate signup and resend/cooldown; pending signup has no session.
2. Password/Google with and without MFA; actual Google consent/link conflicts/cancel/expiry; recovery-code reuse rejection, challenge expiry/exhaustion. Matching public Google client ID/exact frontend origin required.
3. Real session revoke/current revoke/logout-all, MFA confirm/disable/regenerate, recent-login enforcement and recovery display through forced signout.
4. Private PDF upload/download/foreign denial; dispatch/completion with research enabled, cancellation/retry and worker/provider errors.
5. Two real accounts for bookmarks/notifications paging/read/preferences/isolation and forbidden access.
6. Owner/manager/editor/viewer/unrelated accounts for invitation matching-email acceptance/expiry/revoke, role restrictions and profile changes.
7. Completed-owner share redemption/expiry/revoke/private-source exclusion; staff review/publication/role/AI permission and conflict handling.
8. Real key create/list/rotate/revoke and server-to-server supported investigation scopes, without storing/logging keys in the browser.
9. Configured Bachs sandbox checkout, same-key retry, return/re-authentication, pending reconciliation, authoritative balance/subscriptions and portal. Payment acceptance remains blocked until configured.

These are remaining acceptance tasks, not claims of success. Previous backend tests/provider checks are not evidence these frontend paths passed end to end.
