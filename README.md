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

Google Identity Services login and explicit authenticated account linking are wired into Sign in and Security & privacy. Each attempt requests a fresh server nonce, passes it into Google's official button, and exchanges only the callback credential with the backend. Login loads `/auth/me` before opening protected pages. Linking requires a verified local email and leaves the current session intact. Failed/expired attempts require a fresh challenge. Google tokens and nonces are never persisted or logged.

Uploads, investigations, billing, directory and staff API integration remain future slices. Other screens still use the existing prototype data and behavior; their balances, results, billing actions and staff access do not represent backend state or authorization. The admin login remains a separate prototype and is not connected by this change.

## Google and email configuration

Set `VITE_GOOGLE_CLIENT_ID` in the frontend's `.env.local` to the public Google Web OAuth client ID, matching the backend's `GOOGLE_CLIENT_ID`, then restart Vite. Register the frontend's exact origin (including the port) in the Google client's authorized JavaScript origins. Without a frontend client ID, the UI displays that Google is unavailable and does not load Google's script. See [Google's button integration guide](https://developers.google.com/identity/gsi/web/guides/display-button).

The backend also needs Redis for Google challenges. OTP signup needs Redis and a configured SMTP sender. Backend values such as `REDIS_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_USER` and `SMTP_PASSWORD` belong only in the backend environment; consult its `docs/authentication.md`. No Google client secret is needed for this ID-token flow.

For Google acceptance testing, configure both services, then test Google login, a password-account conflict, explicit linking from Security & privacy, a mismatched Google email, a cancelled popup and an expired challenge. Linking has no corresponding unlink endpoint.

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

Live checks now confirm backend health/readiness, the auth paths in `/docs/json`, unauthenticated `/auth/me` returning 401, and invalid password login returning 401. Google challenges return `503 google_auth_unavailable`; a user-authorized registration attempt returns `503 email_auth_unavailable`, so no OTP was sent. Successful signup, OTP delivery, login/logout and Google authorization remain unverified until the backend services are configured and a real account is available.
