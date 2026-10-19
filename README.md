# PadiCheck frontend

React, TypeScript and Vite frontend for PadiCheck.

## Run locally

1. Install dependencies with `npm install`.
2. Start the backend at `http://127.0.0.1:3000`.
3. Run `npm run dev` (use `npm.cmd` on Windows if PowerShell blocks npm scripts).

Vite proxies `/v1`, `/health` and `/ready` to the backend. No environment file is needed for the defaults. To change the target, copy `.env.example` to `.env.local` and edit `API_PROXY_TARGET`.

Leave `VITE_API_BASE_URL` empty for same-origin requests. It can also contain a publicly reachable API origin (a trailing `/v1` is normalized). Cross-origin browser access requires backend CORS, which the current backend does not enable. For production, configure the hosting reverse proxy to forward `/v1` to the backend; the Vite development proxy is not included in the build. Never put backend secrets in `VITE_*` variables.

## Integration status

The first integration slice connects password registration, email signup OTP verification and resend, password login, current-user permissions and logout to the documented `/v1/auth/*` routes.

- Signup sends only `display_name`, `email` and `password`. Password length is 12–128 characters. Registration does not sign the user in.
- Verification preserves leading zeros in the six-digit code. Resend repeats registration after a 60-second cooldown and replaces the challenge ID. The backend controls eligibility, attempts and rate limits.
- Passwords, signup challenges and access tokens are held in memory. Reloading requires login or restarting signup. Leaving the signup flow clears pending registration details.
- The frontend loads `/v1/auth/me` before establishing a session. `session.roles`, `session.permissions` and `hasPermission()` expose backend authorization metadata for subsequent integrations.
- Expiry and protected-request 401 responses clear the session. A public login failure or a 403 does not discard a valid current session. Logout calls the backend and clears local identity even if the network fails, with a message when revocation cannot be confirmed.
- Password reset, phone recovery, Apple sign-in, email-code login, password change, 2FA, global logout, account deletion and device management have no supported API integration. Their former simulated success flows are removed from the consumer auth/security screens.

Google Identity Services login/linking, uploads, investigations, billing, directory and staff API integration remain future slices. Other screens still use the existing prototype data and behavior; their balances, results, billing actions and staff access do not represent backend state or authorization. The admin login remains a separate prototype and is not connected by this change.

## Verification

- `npm run build` builds the production bundle.
- `npm run test:api` runs API-client tests with mocked HTTP responses, without additional dependencies.
- `npx tsc --noEmit` checks types. The existing project has unrelated type and unused-import errors; Vite's build does not type-check.

For live acceptance testing with the backend and email delivery configured:

1. Register a new email, confirm the generic challenge response, and verify that protected pages are still unavailable.
2. Enter the emailed OTP, then confirm `/v1/auth/register/verify` and `/v1/auth/me` succeed before the home page opens.
3. Request a resend after 60 seconds and verify the new challenge replaces the old one. Check invalid, expired and exhausted codes, account conflicts, and 429 cooldowns.
4. Log out and confirm an empty 204 response is accepted. Log in again with the same credentials; check invalid credentials without exposing account existence.
5. Reload and confirm login is required. Check token expiry, protected-request 401, retained-session 403 and unavailable-service errors.

Live signup and OTP delivery have not been verified: the backend was not reachable at `127.0.0.1:3000` during implementation.
