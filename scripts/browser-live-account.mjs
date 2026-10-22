// Live acceptance in an isolated, user-authenticated browser. No credentials logged.
// Leaves the user's session open; creates only a labelled temporary API key.
import { connectPage } from './cdp.mjs';
process.env.BROWSER_DEBUG_ORIGIN ||= 'http://127.0.0.1:9228';
const origin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5187';
const pages = await (await fetch(process.env.BROWSER_DEBUG_ORIGIN + '/json/list')).json();
const target = pages.find(page => page.type === 'page' && page.url.startsWith(origin));
if (!target) throw new Error('Open the isolated signup browser first.');
let bearer;
const observed = [];
const runtimeErrors = [];
const page = await connectPage(target.id, event => {
  if (event.method === 'Network.requestWillBeSent') {
    const request = event.params.request;
    if (request.url.startsWith(origin + '/v1/')) {
      const header = request.headers.Authorization || request.headers.authorization;
      if (header?.startsWith('Bearer ')) bearer = header;
    }
  }
  if (event.method === 'Network.responseReceived') {
    const response = event.params.response;
    const path = new URL(response.url).pathname;
    if (['/v1/auth/register', '/v1/auth/register/verify', '/v1/auth/me'].includes(path)) {
      observed.push({ path, status: response.status });
      console.log(JSON.stringify({ mode: 'live-browser', path, status: response.status }));
    }
  }
  if (event.method === 'Runtime.exceptionThrown') runtimeErrors.push('runtime exception');
  if (event.method === 'Page.javascriptDialogOpening') void page.call('Page.handleJavaScriptDialog', { accept: true });
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (name, passed) => {
  console.log(JSON.stringify({ mode: 'live-account', check: name, pass: Boolean(passed) }));
  if (!passed) throw new Error('Live check failed: ' + name);
};
const route = path => page.evaluate(`(()=>{history.pushState({idx:(history.state?.idx||0)+1},'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'));})()`);
const request = async (path, options = {}) => {
  const response = await fetch(origin + path, {
    ...options, headers: { Accept: 'application/json', Authorization: bearer, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new Error(`Live API ${options.method || 'GET'} ${path}: ${response.status} ${data?.error?.code || ''} ${data?.request_id || ''}`);
  return data;
};
let temporaryKey;
try {
  await page.call('Network.enable');
  console.log(JSON.stringify({ mode: 'live-account', waiting_for: 'User completes signup and email verification in the browser' }));
  for (let attempt = 0; attempt < 1200 && !bearer; attempt++) {
    if (attempt % 10 === 0) {
      const path = await page.evaluate('location.pathname');
      if (!['/signup', '/verify-code', '/signin', '/mfa'].includes(path)) await route('/account/security');
    }
    await sleep(500);
  }
  if (!bearer) throw new Error('No authenticated browser request observed within ten minutes.');
  const me = await request('/v1/auth/me');
  check('real verified session and server permissions', me.user?.email_verified && Array.isArray(me.user.permissions));
  for (const [path, field] of [
    ['/v1/auth/sessions', 'sessions'], ['/v1/me/bookmarks?limit=20&offset=0', 'bookmarks'],
    ['/v1/me/notifications?limit=20&offset=0', 'notifications'], ['/v1/me/notification-preferences', 'preferences'],
    ['/v1/me/business-invitations?limit=20&offset=0', 'invitations'], ['/v1/me/api-keys', 'api_keys'],
    ['/v1/investigations?scope=own&limit=20', 'investigations'],
  ]) {
    const data = await request(path);
    check('authenticated ' + path.split('?')[0], Array.isArray(data[field]));
  }
  const mfa = await request('/v1/auth/mfa');
  check('live MFA status contract', typeof mfa.enabled === 'boolean' && typeof mfa.recovery_codes_remaining === 'number');
  const prefs = await request('/v1/me/notification-preferences');
  const preference = prefs.preferences[0];
  if (preference) {
    await request('/v1/me/notification-preferences', { method: 'PATCH', body: JSON.stringify({ notification_type: preference.notification_type, enabled: preference.enabled }) });
    check('notification preference idempotent update', true);
  }
  await route('/developers/keys');
  await page.waitFor("document.querySelector('input[name=name]')!==null");
  const name = 'Live integration test ' + new Date().toISOString();
  await page.evaluate(`(()=>{const field=document.querySelector('input[name=name]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(name)});field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await page.evaluate("document.querySelector('form button:not([type]), form button[type=submit]').click()");
  await page.waitFor("document.body.innerText.includes('Save this secret now')");
  const keys = await request('/v1/me/api-keys');
  temporaryKey = keys.api_keys.find(key => key.name === name)?.api_key_id;
  check('API key created through real frontend form', temporaryKey);
  check('key list excludes secret values', keys.api_keys.every(key => !key.secret && !key.key_hash));
  check('secret shown privately without browser persistence', await page.evaluate("(()=>{const secret=document.querySelector('code')?.textContent;if(!secret)return false;return !JSON.stringify({...localStorage,...sessionStorage}).includes(secret);})()"));
  await page.evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('I saved it')).click()");
  check('secret dismissed from rendered UI', await page.evaluate("!document.body.innerText.includes('Save this secret now')"));
  await page.evaluate(`(()=>{const section=[...document.querySelectorAll('section')].find(node=>node.querySelector('h2')?.textContent===${JSON.stringify(name)});[...section.querySelectorAll('button')].find(button=>button.textContent==='Rotate key').click();})()`);
  await page.waitFor("document.body.innerText.includes('Save this secret now')");
  check('real API key rotation displays replacement once', true);
  const rotated = await request('/v1/me/api-keys');
  temporaryKey = rotated.api_keys.find(key => key.name === name && !key.revoked_at)?.api_key_id;
  check('rotation replaces and revokes original key metadata', temporaryKey && rotated.api_keys.some(key => key.name === name && key.revoked_at));
  await request(`/v1/me/api-keys/${temporaryKey}`, { method: 'DELETE' });
  temporaryKey = undefined;
  check('temporary key revoked', true);
  await route('/notifications');
  await page.waitFor("document.body.innerText.includes('Notifications')");
  await route('/account/security');
  await page.waitFor("document.body.innerText.includes('Active sessions')");
  check('security UI renders live session and MFA data', await page.evaluate("document.body.innerText.includes('Current session')"));
  check('no runtime exceptions', runtimeErrors.length === 0);
  console.log(JSON.stringify({ mode: 'live-account', completed: true, auth_responses: observed, remaining: ['MFA enrollment/recovery mutations', 'two-account isolation', 'media/investigation execution', 'teams/moderation/sharing', 'configured research/billing'] }));
} finally {
  if (temporaryKey && bearer) await request(`/v1/me/api-keys/${temporaryKey}`, { method: 'DELETE' }).catch(() => console.log('Temporary key cleanup failed; revoke the labelled test key in API keys.'));
  bearer = undefined;
  page.disconnect();
}
