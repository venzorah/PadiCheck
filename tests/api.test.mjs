import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Compile the real TypeScript modules without a browser or extra test dependencies.
const encode = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`;
const clientUrl = encode((await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_BASE_URL', "'https://api.example.test/v1/'"));
const client = await import(clientUrl);
const { authApi } = await import(encode((await readFile(new URL('../src/api/auth.ts', import.meta.url), 'utf8')).replace("'./client'", JSON.stringify(clientUrl))));
const googleModuleUrl = encode((await readFile(new URL('../src/utils/googleIdentity.ts', import.meta.url), 'utf8')).replace("'../api/client'", JSON.stringify(clientUrl)));
const { googleErrorMessage, loadGoogleIdentity } = await import(googleModuleUrl);
const { investigationsApi } = await import(encode((await readFile(new URL('../src/api/investigations.ts', import.meta.url), 'utf8')).replace("'./client'", JSON.stringify(clientUrl))));
const { mediaApi } = await import(encode((await readFile(new URL('../src/api/media.ts', import.meta.url), 'utf8')).replace("'./client'", JSON.stringify(clientUrl))));
const investigationUtilsUrl = encode(await readFile(new URL('../src/utils/investigations.ts', import.meta.url), 'utf8'));
const { buildInvestigation, safeHttpUrl } = await import(investigationUtilsUrl);
const pollingUrl = encode((await readFile(new URL('../src/utils/investigationPolling.ts', import.meta.url), 'utf8')).replace("'../api/client'", JSON.stringify(clientUrl)).replace("'./investigations'", JSON.stringify(investigationUtilsUrl)));
const { startInvestigationPolling } = await import(pollingUrl);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; client.setAccessToken(null); });

test('signup, resend, OTP verification and login use documented payloads without authentication', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ challenge_id: 'challenge', expires_in: 600 });
  };
  client.setAccessToken('existing-token');
  const registration = { display_name: 'Ada', email: 'ada@example.com', password: 'example-password' };
  await authApi.register(registration);
  await authApi.register(registration);
  await authApi.verify({ email: registration.email, challenge_id: 'challenge', code: '012345' });
  await authApi.login(registration.email, registration.password);
  assert.deepEqual(requests.map((r) => r.url), ['https://api.example.test/v1/auth/register', 'https://api.example.test/v1/auth/register', 'https://api.example.test/v1/auth/register/verify', 'https://api.example.test/v1/auth/login']);
  assert.deepEqual(JSON.parse(requests[0].options.body), registration);
  assert.equal(JSON.parse(requests[2].options.body).code, '012345');
  assert.deepEqual(JSON.parse(requests[3].options.body), { email: registration.email, password: registration.password });
  requests.forEach(({ options }) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.get('Authorization'), null);
    assert.equal(options.headers.get('Content-Type'), 'application/json');
  });
});

test('me authenticates with the issued token and logout accepts an empty 204 response', async () => {
  client.setAccessToken('issued-token');
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer issued-token');
    return url.endsWith('/logout') ? new Response(null, { status: 204 }) : Response.json({ user: { permissions: ['reports.submit'] } });
  };
  assert.deepEqual((await authApi.me('issued-token')).user.permissions, ['reports.submit']);
  assert.equal(await authApi.logout(), undefined);
});

test('only a 401 for the current authenticated token expires the session', async () => {
  let expired = 0;
  const unsubscribe = client.onSessionExpired(() => expired++);
  try {
    client.setAccessToken('current');
    globalThis.fetch = async () => Response.json({ error: { code: 'invalid_credentials', message: 'Invalid credentials' } }, { status: 401 });
    await assert.rejects(authApi.login('ada@example.com', 'wrong-password'), { status: 401 });
    await assert.rejects(authApi.me('old-token'), { status: 401 });
    assert.equal(expired, 0);
    await assert.rejects(authApi.me('current'), { status: 401 });
    assert.equal(expired, 1);
    await assert.rejects(client.api('/v1/private', { auth: true }), { code: 'authentication_required' });
  } finally { unsubscribe(); }
});

test('403 retains the session and 429 preserves cooldown and request ID without retrying POST', async () => {
  client.setAccessToken('current');
  let expired = 0;
  let calls = 0;
  const unsubscribe = client.onSessionExpired(() => expired++);
  try {
    globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 'forbidden', message: 'Forbidden' } }, { status: 403 }); };
    await assert.rejects(authApi.me('current'), { status: 403 });
    assert.equal(expired, 0);
    globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 'rate_limited', message: 'Wait' }, request_id: 'req-123' }, { status: 429, headers: { 'Retry-After': '60' } }); };
    await assert.rejects(authApi.login('ada@example.com', 'example-password'), (error) => error.status === 429 && error.retryAfter === '60' && error.requestId === 'req-123');
    assert.equal(calls, 2);
  } finally { unsubscribe(); }
});

test('multipart leaves the boundary to the browser; cancellation reaches fetch', async () => {
  const controller = new AbortController();
  const file = new File(['content'], 'evidence.txt');
  client.setAccessToken('current');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get('Content-Type'), null);
    assert.equal(options.body.get('file'), file);
    assert.equal(options.signal, controller.signal);
    return Response.json({ media_id: 'media' });
  };
  await client.api('/v1/media', { method: 'POST', auth: true, file, signal: controller.signal });
});

test('unavailable and non-JSON error responses remain failures', async () => {
  globalThis.fetch = async () => new Response('Proxy unavailable', { status: 503 });
  await assert.rejects(authApi.login('ada@example.com', 'example-password'), (error) => error.status === 503 && client.apiErrorMessage(error).includes('unavailable'));
});

test('Google login uses a public challenge and ID-token exchange; linking uses the current session', async () => {
  const requests = [];
  client.setAccessToken('padicheck-access-token');
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json(url.endsWith('/challenge') ? { nonce: 'server-nonce', expires_in: 300 } : url.endsWith('/link') ? { linked: true } : { access_token: 'new-padicheck-token' });
  };
  const controller = new AbortController();
  assert.equal((await authApi.googleChallenge('login', controller.signal)).nonce, 'server-nonce');
  await authApi.googleLogin('google-id-token');
  await authApi.googleChallenge('link');
  assert.equal((await authApi.linkGoogle('link-google-id-token')).linked, true);
  assert.deepEqual(requests.map(({ url }) => url.replace('https://api.example.test', '')), ['/v1/auth/google/challenge', '/v1/auth/google', '/v1/auth/google/challenge', '/v1/auth/google/link']);
  assert.deepEqual(requests.map(({ options }) => options.headers.get('Authorization')), [null, null, 'Bearer padicheck-access-token', 'Bearer padicheck-access-token']);
  assert.deepEqual(requests.map(({ options }) => JSON.parse(options.body)), [{ action: 'login' }, { id_token: 'google-id-token' }, { action: 'link' }, { id_token: 'link-google-id-token' }]);
  assert.equal(requests[0].options.signal, controller.signal);
});

test('Google conflicts direct the user to explicit linking or email verification', () => {
  assert.match(googleErrorMessage(new client.ApiError(409, 'account_link_required', 'Conflict')), /Sign in with your password.*link Google/);
  assert.match(googleErrorMessage(new client.ApiError(409, 'email_verification_required', 'Conflict')), /verify your email/);
  assert.match(googleErrorMessage(new client.ApiError(503, 'google_auth_unavailable', 'Unavailable')), /currently unavailable/);
});

test('Google challenge and linking failures give actionable messages', () => {
  assert.match(googleErrorMessage(new client.ApiError(401, 'invalid_google_challenge', 'Expired')), /fresh sign-in/);
  assert.match(googleErrorMessage(new client.ApiError(409, 'verified_email_required', 'Mismatch')), /same email/);
  assert.match(googleErrorMessage(new client.ApiError(409, 'google_identity_linked', 'Conflict')), /another PadiCheck account/);
});

test('Google SDK load failures permit retry and concurrent callers share one script', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scripts = [];
  globalThis.window = { setTimeout, clearTimeout };
  globalThis.document = {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { appendChild(script) { scripts.push(script); } },
  };
  try {
    const failed = loadGoogleIdentity();
    assert.equal(loadGoogleIdentity(), failed);
    scripts[0].onerror();
    await assert.rejects(failed, /Google could not load/);
    assert.equal(scripts[0].removed, true);
    const retry = loadGoogleIdentity();
    assert.equal(scripts.length, 2);
    assert.equal(scripts[1].src, 'https://accounts.google.com/gsi/client');
    const sdk = { initialize() {}, renderButton() {} };
    window.google = { accounts: { id: sdk } };
    scripts[1].onload();
    assert.equal(await retry, sdk);
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});

test('research contexts map to supported investigations without promising specialized checks', () => {
  const base = { type: 'shopping', mode: 'text', text: 'Research this seller and their offer', url: '', mediaIds: [] };
  assert.equal(buildInvestigation(base).investigation_type, 'general_research');
  assert.equal(buildInvestigation({ ...base, type: 'job' }).investigation_type, 'general_research');
  assert.equal(buildInvestigation({ ...base, type: 'business' }).investigation_type, 'company_research');
  assert.equal(buildInvestigation({ ...base, mode: 'link', url: 'example.com' }).input_data.urls[0], 'https://example.com/');
  assert.equal(buildInvestigation({ ...base, mode: 'link', url: 'example.com' }).investigation_type, 'web_analysis');
  assert.throws(() => buildInvestigation({ ...base, type: 'contract' }), /uploaded PDF/);
  assert.equal(buildInvestigation({ ...base, type: 'contract', mode: 'upload', mediaIds: ['document-id'] }).investigation_type, 'contract_review');
  const phone = buildInvestigation({ ...base, type: 'phone', text: '+234 801 234 5678' });
  assert.equal(phone.investigation_type, 'phone_lookup');
  assert.deepEqual(phone.input_data.targets[0].identifiers, [{ identifier_type: 'phone', value: '+2348012345678' }]);
  assert.throws(() => buildInvestigation({ ...base, type: 'phone', text: '08012345678' }), /international/);
  assert.throws(() => buildInvestigation({ ...base, text: 'x'.repeat(10001) }), /10,000/);
  assert.throws(() => buildInvestigation({ ...base, mode: 'link', url: 'https://user:password@example.com' }), /credentials/);
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,unsafe'), null);
});

test('history uses own scope and an opaque cursor; findings and sources paginate independently', async () => {
  client.setAccessToken('session');
  const urls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer session');
    urls.push(new URL(url));
    return Response.json(url.includes('/sources') ? { sources: [] } : url.includes('/findings') ? { findings: [], limitations: [] } : { investigations: [], next_cursor: null });
  };
  const cursor = 'opaque+/=cursor';
  assert.equal((await investigationsApi.list(cursor)).next_cursor, null);
  await investigationsApi.sources('investigation', 20);
  await investigationsApi.findings('investigation', 40);
  assert.equal(urls[0].searchParams.get('scope'), 'own');
  assert.equal(urls[0].searchParams.get('cursor'), cursor);
  assert.equal(urls[0].searchParams.has('offset'), false);
  assert.equal(urls[1].searchParams.get('offset'), '20');
  assert.equal(urls[2].searchParams.get('offset'), '40');
});

test('deferred creation is accepted once and cancel/retry use existing-investigation actions', async () => {
  client.setAccessToken('session');
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ investigation: { investigation_id: 'saved-id', status: 'queued' }, dispatch: 'deferred' }, { status: url.endsWith('/cancel') ? 200 : 202 });
  };
  const payload = buildInvestigation({ type: 'any', mode: 'text', text: 'Research this opportunity', url: '', mediaIds: [] });
  const result = await investigationsApi.create(payload);
  assert.equal(result.dispatch, 'deferred');
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
  await investigationsApi.cancel('saved-id');
  await investigationsApi.retry('saved-id');
  assert.ok(calls[1].url.endsWith('/saved-id/cancel'));
  assert.ok(calls[2].url.endsWith('/saved-id/retry'));
  assert.equal(calls[2].options.body, undefined);
});

test('media uploads use one multipart file and private delivery is requested fresh', async () => {
  client.setAccessToken('session');
  const file = new File(['%PDF-1.7'], 'contract.pdf', { type: 'application/pdf' });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/delivery') ? Response.json({ url: 'https://media.example.test/signed', expires_at: 2000000000 }) : options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ media: { media_id: 'media-id', upload_status: 'ready', media_type: 'document' } }, { status: 201 });
  };
  await mediaApi.upload(file);
  assert.deepEqual([...calls[0].options.body.keys()], ['file']);
  assert.equal(calls[0].options.headers.has('Content-Type'), false);
  await mediaApi.delivery('media-id');
  await mediaApi.delivery('media-id');
  await mediaApi.remove('media-id');
  assert.equal(calls.length, 4);
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[3].options.method, 'DELETE');
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
const detailWith = (status, ai_analysis = true) => ({ investigation: { status }, capabilities: { independent_search: ai_analysis, ai_analysis }, limitations: [] });
test('polling follows active states, slows down without AI, and stops at completion', async () => {
  const scheduled = [];
  const states = [];
  const details = [detailWith('queued', false), detailWith('analyzing'), detailWith('completed')];
  const stop = startInvestigationPolling({
    read: async () => details.shift(), onData: (data) => states.push(data.investigation.status), onError: assert.fail,
    schedule: (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; }, unschedule: () => {},
  });
  await flush();
  assert.equal(scheduled[0].delay, 15000);
  scheduled.shift().callback(); await flush();
  assert.equal(scheduled[0].delay, 4000);
  scheduled.shift().callback(); await flush();
  assert.deepEqual(states, ['queued', 'analyzing', 'completed']);
  assert.equal(scheduled.length, 0);
  stop();
});

test('polling respects Retry-After and stops on permission or missing-resource errors', async () => {
  for (const status of [403, 404, 429]) {
    const scheduled = [];
    const stop = startInvestigationPolling({
      read: async () => { throw new client.ApiError(status, 'failure', 'Failed', undefined, '120'); },
      onData: assert.fail, onError: () => {},
      schedule: (callback, delay) => { scheduled.push({ callback, delay }); return 1; }, unschedule: () => {},
    });
    await flush();
    if (status === 429) assert.equal(scheduled[0].delay, 120000); else assert.equal(scheduled.length, 0);
    stop();
  }
});

test('stopping polling aborts the in-flight read and ignores its late result', async () => {
  let resolve;
  let signal;
  let notifications = 0;
  const stop = startInvestigationPolling({
    read: (requestSignal) => { signal = requestSignal; return new Promise((done) => { resolve = done; }); },
    onData: () => notifications++, onError: () => notifications++,
    schedule: () => assert.fail('Stopped polling scheduled another request'),
  });
  stop();
  assert.equal(signal.aborted, true);
  resolve(detailWith('queued'));
  await flush();
  assert.equal(notifications, 0);
});
