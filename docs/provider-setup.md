# Configure live research and sandbox payments

Use `C:\Users\HP\Desktop\projects\padicheck\.env`, the backend environment. Do not put these credentials in the frontend environment or send them in chat. Existing database, Redis, SMTP, Google and Cloudinary settings should be retained.

## 1. Gemini

Open [Google AI Studio API keys](https://aistudio.google.com/apikey), select/import your Google Cloud project and create a new Gemini API key. Add it privately as `GEMINI_API_KEY` in the backend environment. Google documents key creation and current key requirements in its [API key guide](https://ai.google.dev/gemini-api/docs/api-key).

The Google OAuth client ID used for login is a different credential. It cannot replace a Gemini API key. The backend stores the analysis model ID in its AI registry; do not put a guessed model ID in frontend code.

## 2. UltraSearch

The backend expects [Ramcharan747/UltraSearch](https://github.com/Ramcharan747/UltraSearch), a separate service exposing GET /search. Inspection of the actual checkout found that commit b9bb963 removed its root build files. The README build command therefore does not work on that revision. The installed Go version is 1.25.5; the project's go.mod requests Go 1.26.2, which Go downloads automatically and needs adequate free disk space to unpack.

A build-only copy of the preceding revision, 39501fa, is prepared at C:\Users\HP\Desktop\projects\padicheckui\.tmp\ultrasearch-service. The original checkout is unchanged. Build the complete package rather than naming three files.

The executable has already been built and started locally on port 8082. Health and a real organic search both passed; the search returned `https://example.com/`. Do not start a second instance while that service is running. The commands below are for rebuilding or restarting it later. Local compatibility fixes bind the API to loopback, omit crawler delays for snippet-only calls, exclude AI overview entries from the result limit, and resolve Google's relative redirects to source URLs.

PowerShell:

```powershell
cd C:\Users\HP\Desktop\projects\padicheckui\.tmp\ultrasearch-service
go build -o ultrasearch.exe .
.\ultrasearch.exe -serve -port 8082
```

Git Bash:

```bash
cd /c/Users/HP/Desktop/projects/padicheckui/.tmp/ultrasearch-service
go build -o ultrasearch.exe .
./ultrasearch.exe -serve -port 8082
```

The Windows executable exists only after a successful build. In Git Bash use ./, not .\. Keep the service running separately from the PadiCheck API and worker. If hosted elsewhere, use its reachable base URL instead. This generated build folder is gitignored and must be retained while using this local service.

In the backend environment:

```dotenv
GEMINI_API_KEY=your_private_Gemini_key
ULTRASEARCH_URL=http://127.0.0.1:8082
ULTRASEARCH_API_KEY=
RESEARCH_ENABLED=false
```

Leave `ULTRASEARCH_API_KEY` empty unless an authenticating reverse proxy was configured for that service. `ULTRASEARCH_URL` is the base URL, not the `/search` endpoint. PadiCheck requests organic search with `ai_mode=none` and `content=false` and fetches source pages itself.

After both services are configured, run in the backend directory:

```powershell
npm.cmd run integrations:check
```

The result should pass `gemini` and `ultrasearch`. Its output reports checks without exposing credentials. Then the AI registry must contain active provider/model/agent/task/tool assignments as specified in the backend's `docs/milestone-3.md`. This is part of the implementation work; a key alone is insufficient.

The local registry uses `gemini-3.5-flash-lite`, the evidence reviewer, and all three required tools. This model completed a real public-text analysis in about 7.5 seconds and passed exact-quotation validation. Its selection is audited. The former `gemini-3.8-flash` assignment is disabled; its model and execution history are retained. Google rejected `gemini-2.5-flash-lite` with 404 and `gemini-3-flash-preview` timed out during the same comparison, so neither was enabled as a fallback. Model-list visibility alone does not guarantee generation access. The backend Gemini request uses the documented REST enum `APPLICATION_JSON` for structured output. See [Google's Generate Content structured-output reference](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

For a **new, empty database only**, the operator setup command is available in the backend:

```powershell
node --import tsx scripts/configure-research.ts gemini-3.5-flash-lite
node --import tsx scripts/configure-research.ts gemini-3.5-flash-lite --apply
```

The first command previews the change. The second initializes an empty registry transactionally and writes an audit record. It refuses to replace existing entries. Use authenticated AI administration for later edits. Model availability must be checked again when setting up another environment.

Once provider checks and registry routing pass, change `RESEARCH_ENABLED=true`, restart the backend API and run the investigation worker in another terminal:

```powershell
npm.cmd run worker:dev
```

The API and worker must load the same backend environment. Billing may remain disabled while research is tested.

### Latest live result (23 October 2026)

The real queued `example.com` investigation now completes using `gemini-3.5-flash-lite`. It collected six sources, retrieved two pages, and saved an analysis summary and two findings. The successful model run took 16.84 seconds, using 1,457 input tokens and 427 output tokens. Both saved evidence quotations match their linked source excerpts. The former model's failed run remains in the execution history. The API and worker are running with research enabled.

To check generation again later, run this backend diagnostic. It makes one real request using public sample text and validates the resulting findings and exact evidence quotations:

```powershell
node --import tsx scripts/check-research-generation.ts
```

Expect `generation: passed` and `validation: passed`. Failure codes distinguish `provider_unavailable`, `provider_rate_limited`, `provider_timeout`, and `provider_connection_failed` without exposing credentials or raw provider responses. A passed diagnostic checks the model adapter; it does not exercise browser interactions. The successful worker test is labelled `Live integration check (example.com)` in the test account history, investigation `ea196d59-7b9a-4384-bcee-9a805b3bd17c`. Open it after signing into that account, then submit a fresh check through the frontend for browser acceptance.

UltraSearch is the discovery stage for non-contract investigations: it searches public web results, while PadiCheck separately retrieves source pages and Gemini interprets their evidence. It does not generate the final findings or certify a business. Contract reviews skip web search and use the submitted document evidence instead.

On 24 October 2026, deeper search was enabled: six focused queries, up to five results per query, up to 25 discovered sources, and a 180-second collection budget. Analysis prefers retrieved pages and multiple hosts, using up to 20 excerpts within a fixed total text budget. A live Mozilla test completed in 60.01 seconds with six successful queries, 25 sources, 21 retrieved pages and four findings; all five saved quotations matched their source excerpts. See [deep-search configuration and validation](deep-search.md). New checks use this configuration automatically; historical completed reports retain their existing evidence.

A subsequent real UI company search exposed an evidence-validation failure: the model returned unsupported quotations and an uncited finding. The prompt now requires unsupported findings to be omitted and evidence gaps to be stated in limitations. The pipeline allows one validation-repair attempt and records each run; it still rejects fabricated source IDs, quotations, and unsupported findings. The reported check now completes with a saved summary and no supported findings. A completed check can honestly report insufficient evidence; it does not imply a business is verified or safe. Status-specific frontend messages replace the generic failure placeholder without changing the layout.

## 3. Bachs sandbox

For the new phone intelligence, business registry and property-location integrations, use the separate [verification provider setup guide](verification-providers.md). These services default to disabled and need their own accounts; the Gemini/Google login credentials do not enable them.

Create/sign into [Bachs](https://app.bachs.io/) and use its sandbox. In the developer section, create a sandbox API key. Create the actual one-time/recurring products you intend to sell. Obtain the merchant organization/account ID and create a webhook destination; keep its signing secret private. See the [official Bachs quickstart](https://docs.bachs.io/introduction) and the backend's `docs/payments.md` for supported event subscriptions and offer mapping.

Fill these as one complete group in the backend environment, leaving billing disabled until checks and offer mappings are ready:

```dotenv
BACHS_ENVIRONMENT=sandbox
BACHS_API_KEY=your_private_sk_sandbox_key
BACHS_WEBHOOK_SECRET=your_private_webhook_secret
BACHS_ORGANIZATION_ID=your_acct_identifier
BACHS_SUCCESS_URL=https://jean-unprospering-numerically.ngrok-free.dev/billing/return
BACHS_CANCEL_URL=https://jean-unprospering-numerically.ngrok-free.dev/billing/cancel
BILLING_ENABLED=false
```

The webhook destination is:

```text
https://jean-unprospering-numerically.ngrok-free.dev/v1/webhooks/bachs
```

Use the actual current HTTPS origin if the tunnel changes. The frontend Vite proxy forwards `/v1` to the backend. Sandbox products must match the server offer's price, currency, mode and investigation allowance; prices and allowances must be chosen by the business owner, not invented by the integration.

After configuration, product/offer mapping, schema verification and webhook testing, enable the intended offers and set `BILLING_ENABLED=true`, then restart the API. In the current backend this enables paid-unit enforcement for new investigations. A checkout redirect alone never credits an account.

## What to report back

Once the values are set privately, say “Gemini and search configured” and/or “Bachs sandbox configured.” Do not include the values. We can then run service checks and complete live acceptance.
