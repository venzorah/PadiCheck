import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
async function loadClient(base, origin) {
  const configured = source.replace('import.meta.env.VITE_API_BASE_URL', JSON.stringify(base))
    .replace('globalThis.location?.origin', JSON.stringify(origin));
  const { outputText } = ts.transpileModule(configured, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

for (const [base, origin, expected] of [
  ['', 'https://demo.ngrok-free.dev', true],
  ['https://api.ngrok-free.app', 'http://localhost:5173', true],
  ['https://api.ngrok.io', 'http://localhost:5173', true],
  ['', 'http://localhost:5173', false],
  ['https://api.example.com', 'https://demo.ngrok-free.dev', false],
  ['https://ngrok-free.dev.example.com', 'http://localhost:5173', false],
]) {
  test(`API ngrok warning bypass: ${base || origin}`, async () => {
    const client = await loadClient(base, origin);
    let calls = 0;
    globalThis.fetch = async (_url, options) => {
      calls++;
      assert.equal(options.headers.get('ngrok-skip-browser-warning'), expected ? 'true' : null);
      assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
      assert.equal(options.cache, 'no-store');
      return expected && !options.headers.has('ngrok-skip-browser-warning')
        ? new Response('ngrok warning', { status: 200 })
        : Response.json({ user: { users_id: 'verified-user' } });
    };
    assert.equal((await client.api('/v1/auth/me', { auth: true, token: 'test-token' })).user.users_id, 'verified-user');
    assert.equal(calls, 1);
  });
}