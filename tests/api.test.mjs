import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Compile the real TypeScript modules without a browser or extra test dependencies.
const encode = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`;
const clientUrl = encode((await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_BASE_URL', "'https://api.example.test/v1/'"));
const client = await import(clientUrl);
const { authApi } = await import(encode((await readFile(new URL('../src/api/auth.ts', import.meta.url), 'utf8')).replace("'./client'", JSON.stringify(clientUrl))));
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
