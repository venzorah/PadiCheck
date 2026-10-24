# Full feature completion work log

23 October 2026. The user confirmed real login and signup work, then explicitly authorized changes to `C:\Users\HP\Desktop\projects\padicheck` in addition to this frontend. The earlier backend-read-only integration restriction is superseded for this work. Preserve the original UI and all unrelated user edits.

## Current verified facts

- Backend health/readiness is live. Redis, email and media storage are configured.
- Gemini, UltraSearch, Redis, database, email, Google and media connectivity checks have passed. Research is enabled and the worker is running. After comparison tests, the primary model was switched and audited to `gemini-3.5-flash-lite`; the failing `gemini-3.8-flash` assignment is disabled. A real queued test completed with a summary and two findings; both saved evidence quotations match linked source excerpts. Its successful model run took 16.84 seconds. Browser acceptance of a fresh investigation remains outstanding. Billing remains disabled.
- Google login/signup are user-confirmed live. Prior `origin_mismatch` reports are historical.
- Backend has unrelated uncommitted edits, notably email routes, email queue, docs and package configuration. Do not reset or overwrite them.

## Implemented in this completion pass

- 24 October: added real superadmin plan creation/editing at `/admin/plans` and `/admin/plans/new`, with NGN-only prices, features, credit allowances, publishing and a single admin-selected popular plan per audience. Naira checkout is explicitly a one-time 30-/365-day manual-renewal pass, with idempotent provider products and expiring credit grants; no USD conversion or automatic recurring charges. Migration 008 applied. Created the explicitly requested local test superadmin and two consumers; passwords are in a Git-ignored local file blocked by Vite. Optional catalog seeding was declined; existing cards remain unavailable previews until admin publishes replacements. See [admin plans](admin-plans.md).

- 24 October: connected the original Billing history table to an authenticated owner-scoped, environment-scoped backend history endpoint, using recorded one-time payments and verified subscription invoice grants. Added pagination/loading/error/empty/refresh states and refresh on checkout payment confirmation. Currency-aware receipt details replace fabricated VAT/card-method data. See [billing history](billing-history.md).

- 24 October: fixed sign-in loss on refresh, new tabs and hosted-checkout return. Added an HttpOnly same-origin browser session, hash-only server storage, short-lived bearer renewal, protected-page restoration gating and persistent logout/revocation. Migration 007 is applied locally. Original authentication time and sensitive-action reauthentication boundaries are preserved. The user confirmed `/credits` refresh and `/account` in a new tab both stay signed in and show the paid 10 credits. See [browser sessions](browser-sessions.md).

- 24 October: connected existing admin Welcome credits and What checks cost controls to persisted superadmin-only policy APIs, with revision checks and audit history. Verified email/Google signup awards once in the account transaction; per-category spending is atomic, supports multiple grants and rejects stale confirmed prices or insufficient balance without saving a check. Frontend balances/activity and both search flows use backend costs. Migration 006 is applied locally. Enforcement defaults off until an admin configures amounts and enables backend `CREDITS_ENABLED`; no arbitrary welcome bonus or retroactive award was chosen. See [credit integration](credit-integration.md). Failed/cancelled checks are not automatically refunded; retries of the same check do not add charges.

- Corrected business reports to match server entity IDs, not business names.
- Corrected withdrawn/rejected/resolved report/dispute presentation; a resolved dispute is no longer falsely labelled as upholding the original report.
- Added real report/dispute/verification withdrawal controls to original screens and real share-link listing/revocation, with original sheet/button styles.
- Backend added `GET/PATCH /v1/me/account`, `POST /v1/auth/password/change`, and public `POST /v1/auth/password/reset/request` and `/confirm`.
- Password reset uses a purpose-bound six-digit email code, single-use Redis challenges, account-neutral request responses, password-state binding and session/challenge revocation. It never issues a session or removes MFA. It reuses the encrypted email queue and adds an explicit reset email template.
- Frontend Forgot/Reset password and Security password change are connected. Linked-provider state now comes from the account API.
- Added draft business creation, own/team business listing, private business details and reports, atomic owner-authorized profile editing, and business-scoped dispute history. Identity changes invalidate earlier verification decisions. Migration 005 adds profile details and has been applied locally. The original directory form now saves real drafts and does not claim a payment occurred.
- Fixed the Gemini structured-output MIME enum after a real Google request exposed the incorrect value. All six research-adapter tests and the business ownership/visibility regression test pass. Backend semantic typecheck passes.
- Added sanitized provider availability/rate-limit/timeout/connection errors and a repeatable public-text generation diagnostic. Final verification: seven provider/research-adapter tests pass sequentially, business ownership test passes, backend semantic typecheck passes, all 36 frontend API tests pass, and the frontend production build passes. A PDF test timed out during concurrent heavy checks, then passed in the sequential rerun. The API and worker were restarted with the latest changes; frontend development is available on localhost:5713. No UI layout changes were made in this provider setup pass.
- A real UI company search exposed invalid model quotations and an uncited finding. Findings still require exact linked evidence. Prompts now explicitly omit unsupported findings and put evidence gaps in limitations; zero findings are allowed when no supported finding is available. The pipeline makes at most one validation-repair attempt across its model routes, retains failed execution records, and preserves the final safe failure code. Server-side ownership, cancellation and active-route checks remain in place for every attempt. Provider-compatible JSON schema is retained after Google rejected additional schema bounds; server validation enforces those bounds. Live public-text generation and validation passed with the final schema.
- Failed, pending and cancelled checks now show meaningful state/error messages in the existing presentation layout. Latest verification: 39 frontend tests, 13 backend research/output tests, frontend and backend semantic typechecks, and frontend production build passed. The reported failed UI company search was retried through the real worker and completed with a saved summary and zero supported findings; it reports the evidence gap instead of manufacturing findings. Its earlier failed runs remain recorded.
- Backend semantic typecheck passed. New database-backed account and existing email-worker tests passed: 14 tests, zero failures. Frontend semantic check passed before the final reset/share additions; rerun after remaining work.

## Deeper search completed on 24 October 2026

The original one-query/five-result search is now configured to six focused queries with up to 25 discovered sources. Query results are interleaved, tracking duplicates removed and host diversity preferred. Page collection is bounded to 180 seconds before starting another request. Partial query failures retain useful evidence; cancellation and tool permissions are checked between operations. Analysis selects up to 20 excerpts, prioritising retrieved pages, within the previous 96,000-character maximum text budget. Contract evidence remains excluded from web search. No UI layout changes were made.

Validation passed: 24 research/planning/evidence/AI-administration tests, backend semantic typecheck, regenerated OpenAPI/API reference (125 operations), and a real worker test. The live Mozilla check completed in 60.01 seconds: six successful queries, 25 sources, 21 retrieved pages, 20 analysis excerpts, four findings and five matching source quotations. API/proxy/UltraSearch health returned 200. See `docs/deep-search.md` for limits and the report link. This completes deeper public-source discovery; the broader application work below remains outstanding.

## Remaining work, in order

### Specialist-provider integration prepared on 24 October 2026

Phone lookup (Twilio Basic / explicit paid line type), Nigerian RC registry lookup (Dojah), alternative OpenCorporates records, and Google Maps place-ID location checks are implemented and connected to worker execution and existing report cards. Optional structured matching fields were added to the existing forms. Jobs now use `job_search`, preserve employer information and explicitly require independent employer/recruiter confirmation. No account OTP/SMS is sent by a phone research request. CAC BN/IT support, account phone-possession OTP, official property-title integration and manual title-review workflows remain separate outstanding work.

The user has none of these provider accounts. All new provider flags remain disabled. Live specialist-provider acceptance is pending credentials, access and any required funding; no paid vendor request was made. The integration keeps provider fields private, excludes raw payloads/director/subscriber identities and credentials, checks ownership/cancellation, caches persisted batches on retries and returns category-specific states rather than an overall verified badge. Google Maps stores only place IDs and the submitted address, not provider-generated coordinates/addresses. Setup and pricing are in `docs/verification-providers.md` in both repositories.

Verification: 22 backend specialist/research tests and 41 frontend tests pass; frontend and backend semantic typechecks and frontend build pass. Backend OpenAPI/API reference regenerated (125 operations). Initial parallel frontend validation hit machine memory limits; stopping agent-launched services, removing 11 closed temporary test-browser profiles and running checks sequentially resolved it. API, worker, UltraSearch and frontend were restarted afterward. Paid-provider live tests were not attempted without accounts.

1. Verify the current frontend changes in browser/API tests and add reset/withdraw/share coverage. Backend OpenAPI documentation is current.
2. Browser acceptance for the implemented draft business onboarding, private owner/team views, profile editing and scoped disputes. The former admin-only creation/private-detail API gaps are implemented; no payment is claimed on a draft submission.
3. Reviews/replies/moderation, server certificate issuance/expiry/revocation/QR verification, factual business metrics and score policy with evidence/provenance (no manufactured numeric score).
4. Account profile editing, account deletion/retention/export/privacy preferences, email-code login, recovery requests and Apple sign-in configuration/verification.
5. Admin user management, support, analytics, roles/team, audit, content/settings, notifications/data sources, complete AI configuration UI, billing administration. Original AdminDataContext still has local setters; these must not report successful authoritative operations.
6. Talent profile/job/candidate persistence and real matching/search; developer usage/logs, real sandbox and signed webhooks/delivery worker.
7. Configure and exercise research, uploads, worker execution, completed findings, bookmarks/sharing, teams/moderation and sandbox payments against real services. Provider configuration is not proof of acceptance.

The entire application is not complete. This ledger records ongoing work and is not a release acceptance statement.

## Backend write mechanism

Backend is outside the writable frontend root. Prepared files are staged in ignored `.tmp/backend-features/` with a manifest of before-hashes. `.tmp/apply-backend-features.mjs` validates target paths and checks existing files did not change before copying. Apply using an escalated command only. Its first manifest has already been applied; regenerate the manifest against current backend contents for later batches. Do not replay that old manifest.
