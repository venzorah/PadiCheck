# Google login and signup

The frontend uses Google Identity Services and the existing backend Google routes for both Sign in and Create account. The public Web client ID is configured locally in ignored `.env.local` as `VITE_GOOGLE_CLIENT_ID`. Set the same public variable in the deployment build environment. It must match the backend `GOOGLE_CLIENT_ID`; a client secret is never used by the browser.

## Behavior

- Sign in: Continue with Google obtains a fresh backend login nonce, displays the Google SDK button, and exchanges the returned ID token at `POST /v1/auth/google`.
- Signup: accept the existing Terms/Privacy checkbox, then Create account with Google. Email/password fields are not required for Google. The same backend endpoint creates eligible new Google accounts and returns a session; the frontend never fabricates a registration or skips a required MFA challenge.
- MFA: an MFA challenge navigates to the existing second-factor screen before calling `/auth/me` or establishing a session.
- Existing password accounts: the backend requires explicit linking. Sign in with the password first, then link the matching Google account under Security & privacy. Third-party email identities may require normal email signup/verification first, as determined by the backend.
- Nonces, Google ID tokens and access tokens remain transient. Retry/cancel starts a new nonce; duplicate Google callbacks are consumed only once.

## Google Console setup

In the Google Web OAuth client's Authorized JavaScript origins, register the exact origins used by the browser. Relevant development examples are `http://localhost`, `http://localhost:5173`, and `http://localhost:5187`. If using the current tunnel, also register `https://jean-unprospering-numerically.ngrok-free.dev`. Add the actual production origin before deploying. Origins have no route path. This implementation uses a popup/JavaScript credential callback, so it does not need a frontend OAuth redirect callback route.

See Google's [setup instructions](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [button integration guide](https://developers.google.com/identity/gsi/web/guides/display-button). Google Console configuration is external to this repository and was not changed by the frontend implementation.

## Validation on 23 October 2026

- `npm.cmd run test:api`: 36 passed.
- Semantic TypeScript check, scoped ESLint and production build: passed.
- `node scripts/browser-google-mocked.mjs`: 11 checks passed with an explicitly mocked Google SDK/backend, covering login, signup terms, nonce/client configuration, callback deduplication, memory-only credentials, MFA, account conflicts and retry.
- Live backend readiness reports Google configured. A real public Google challenge returned 200 with a nonce and a 300-second expiry. Nonce contents were not logged.
- The real Google Identity Services SDK loaded and its button iframe rendered on `http://localhost:5187/signin` without an application alert or origin diagnostic during the check. No Google account was selected and no real ID token was exchanged during that check.

Final live acceptance requires the account owner to complete Google's prompt. A loaded SDK/button and configuration flag do not establish a successful Google account exchange.

## Live acceptance blocker

The account owner attempted real sign-in and Google returned `400 origin_mismatch`, requesting registration of the JavaScript origin. Register the exact browser origin under the Web OAuth client used by the supplied public client ID. The owner is moving testing to ngrok; register the HTTPS origin that ngrok actually displays, without `/signin` or another path. An ngrok hostname must also be allowed by Vite. The currently allowed hostname is `jean-unprospering-numerically.ngrok-free.dev`. The Google Console entry must be saved before reloading and starting a fresh Google flow. This external configuration has not been changed by Codex, and successful real account exchange remains unverified.
