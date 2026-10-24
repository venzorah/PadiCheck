# PadiCheck frontend

React, TypeScript and Vite frontend using the backend's 21 October 2026 API contract. The original PadiCheckV2 presentation has been restored; see [UI restoration and validation](docs/ui-restoration.md).

## Run locally

1. Install dependencies with `npm install`.
2. Start the backend at `http://127.0.0.1:3000` and its email/investigation workers as required.
3. Run `npm run dev` (`npm.cmd` on Windows if PowerShell blocks npm scripts).

Vite proxies `/v1`, `/health` and `/ready`. Defaults need no environment file. Copy `.env.example` to `.env.local` to override `API_PROXY_TARGET`. Leave `VITE_API_BASE_URL` empty for same-origin requests. Never put backend secrets in `VITE_*` variables.

See [Google login and signup](docs/google-auth.md) for setup, account-linking behavior and validation. For Google, set the public `VITE_GOOGLE_CLIENT_ID` to match the backend client ID. Authorized JavaScript origins must include the exact frontend origin and port. Readiness configuration flags do not establish Google consent, mailbox delivery or worker liveness.

Production hosting must route SPA URLs to `index.html` and reverse-proxy `/v1` over HTTPS. Vite's proxy is development-only. The backend has no cross-origin browser CORS contract. The build emits `/sw.js` and `/admin/sw.js`; private API responses and signed downloads remain network-only.

## Integration status

Supported auth/MFA/sessions, investigations/private PDF evidence, bookmarks, in-app notifications, directory, incident reports/disputes/verification submissions, business teams/profile edits, API-key lifecycle, completed-investigation shares, authoritative billing and selected permission-based staff workflows are connected to APIs. Unsupported prototype controls explain their limitations.

Tokens and secrets stay in memory. Reload requires login. Recovery codes and API-key secrets have intentional one-time displays. Checkout return retains only the non-secret local checkout UUID; the backend determines payment and allowances.

See [the integration handoff](docs/frontend-integration-status.md) for changed files, validation results, live-service blockers and remaining acceptance. Implementation is separate from successful provider acceptance.

## Verify

```powershell
npm.cmd run test:api
npm.cmd run build
.\node_modules\.bin\tsc.cmd --noEmit --noUnusedLocals false --noUnusedParameters false
```

API tests use mocked HTTP. The type check excludes historical unused-code diagnostics; Vite itself does not type-check.

Browser scripts require an isolated Chromium instance with remote debugging on `127.0.0.1:9227` and Vite on `127.0.0.1:5187`. Override these with `BROWSER_DEBUG_ORIGIN` and `FRONTEND_ORIGIN`.

```powershell
node scripts/browser-platform-mocked.mjs
node scripts/browser-smoke.mjs
# With the backend stopped, explicitly test its error states instead:
node scripts/browser-smoke.mjs --backend-unavailable
# User-assisted account checks in the separate interactive browser on port 9228:
node scripts/browser-live-account.mjs
```

The platform browser script uses synthetic API fixtures, not live provider/accounts. Default smoke expectations assume the documented local disabled-billing/empty-directory state; this is not a general acceptance suite for a populated deployment.
