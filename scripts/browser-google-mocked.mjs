// Exercises the UI with an explicitly fake Google SDK and mocked backend.
// No Google account, real credential, or live account creation is used.
import { connectPage } from './cdp.mjs';
const origin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5187';
let mode = 'session', exchanges = 0, me = 0, challenges = 0;
const errors = [], unknown = [];
const page = await connectPage(undefined, event => {
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text);
  if (event.method === 'Fetch.requestPaused') void respond(event.params);
});
async function respond(event) {
  const path = new URL(event.request.url).pathname;
  let body = {}, status = 200;
  if (path === '/v1/auth/google/challenge') {
    if (event.request.headers.Authorization) errors.push('Public challenge sent bearer');
    challenges++; body = { nonce: 'fixture-nonce-' + challenges, expires_in: 300 };
  } else if (path === '/v1/auth/google') {
    exchanges++;
    if (event.request.headers.Authorization) errors.push('Google exchange sent bearer');
    if (JSON.parse(event.request.postData).id_token !== 'fixture-google-credential') errors.push('Unexpected credential');
    if (mode === 'mfa') body = { mfa_required: true, challenge_token: 'fixture-mfa', expires_in: 300 };
    else if (mode === 'conflict') { status = 409; body = { error: { code: 'account_link_required', message: 'Link required' } }; }
    else body = { access_token: 'fixture-google-session', token_type: 'Bearer', expires_in: 900 };
  } else if (path === '/v1/auth/me') {
    me++; body = { user: { users_id: 'google-test-user', email: 'google@example.test', display_name: 'Google test user', email_verified: true, roles: ['user'], permissions: ['investigations.create'] } };
  } else if (path === '/v1/directory') body = { businesses: [] };
  else if (path === '/v1/investigations') body = { investigations: [], next_cursor: null };
  else if (path === '/v1/billing/me') body = { enabled: false, available_units: 0 };
  else if (path === '/v1/reports') body = { reports: [] };
  else if (path === '/v1/disputes') body = { disputes: [] };
  else if (path === '/v1/me/bookmarks') body = { bookmarks: [] };
  else if (path === '/v1/me/notifications') body = { notifications: [] };
  else if (path === '/v1/me/notification-preferences') body = { preferences: [] };
  else if (path === '/v1/me/api-keys') body = { api_keys: [] };
  else { unknown.push(path); status = 503; }
  await page.call('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
const clickGoogle = () => page.evaluate("[...document.querySelectorAll('button')].find(button=>/Continue with Google|Create account with Google/.test(button.textContent)).click()");
function check(name, pass) { console.log(JSON.stringify({check: name, pass})); if (!pass) throw new Error(name); }
async function open(route) {
  await page.call('Page.navigate', { url: origin + route });
  await page.waitFor("[...document.querySelectorAll('button')].some(button=>/Continue with Google|Create account with Google/.test(button.textContent))");
}
try {
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.google={accounts:{id:{initialize(options){window.__googleFixture=options;},renderButton(node){const button=document.createElement('button');button.id='fixture-google';button.textContent='Mock Google account';button.onclick=()=>{window.__googleFixture.callback({credential:'fixture-google-credential'});window.__googleFixture.callback({credential:'fixture-google-credential'});};node.append(button);},cancel(){},disableAutoSelect(){}}}};` });
  await page.call('Fetch.enable', { patterns: [{urlPattern: origin + '/v1/*'}] });
  for (const route of ['/signin', '/signup']) {
    mode = 'session'; exchanges = 0; me = 0;
    await open(route);
    await page.call('Emulation.setDeviceMetricsOverride', {width: 375, height: 812, deviceScaleFactor: 1, mobile: true});
    if (route === '/signup') {
      check('Google signup requires terms acceptance', await page.evaluate("[...document.querySelectorAll('button')].find(button=>/Continue with Google|Create account with Google/.test(button.textContent)).disabled"));
      await page.evaluate("document.querySelector('input[type=checkbox]').click()");
    }
    await clickGoogle(); await page.waitFor("!!document.querySelector('#fixture-google')");
    check('Fresh nonce and configured client reach Google SDK ' + route, await page.evaluate("window.__googleFixture.nonce.startsWith('fixture-nonce-')&&window.__googleFixture.client_id.endsWith('.apps.googleusercontent.com')"));
    await page.evaluate("document.querySelector('#fixture-google').click()");
    await page.waitFor("location.pathname==='/'");
    check('Google session accepted once ' + route, exchanges === 1 && me === 1);
    check('Google credentials remain absent from storage ' + route, await page.evaluate("!JSON.stringify({...localStorage,...sessionStorage}).includes('fixture-google')"));
  }
  mode = 'mfa'; exchanges = 0; me = 0;
  await open('/signup'); await page.evaluate("document.querySelector('input[type=checkbox]').click()");
  await clickGoogle(); await page.waitFor("!!document.querySelector('#fixture-google')"); await page.evaluate("document.querySelector('#fixture-google').click()");
  await page.waitFor("location.pathname==='/mfa'"); check('Google signup MFA grants no session before verification', exchanges === 1 && me === 0);
  mode = 'conflict'; exchanges = 0; me = 0;
  await open('/signin'); await clickGoogle(); await page.waitFor("!!document.querySelector('#fixture-google')"); await page.evaluate("document.querySelector('#fixture-google').click()");
  await page.waitFor("document.body.innerText.includes('Sign in with your password')"); check('Existing password accounts require explicit linking', me === 0);
  const before = challenges;
  await clickGoogle(); await page.waitFor("!!document.querySelector('#fixture-google')");
  await page.evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Cancel Google')).click()");
  await clickGoogle(); await page.waitFor("!!document.querySelector('#fixture-google')"); check('Cancel and retry obtains a new nonce', challenges === before + 2);
  check('No unexpected requests or browser exceptions', errors.length === 0 && unknown.length === 0);
} catch (error) {
  console.error(JSON.stringify({errors,unknown,page:await page.evaluate("({path:location.pathname,title:document.title,heading:document.querySelector('h1')?.textContent,buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim())})")}));
  throw error;
} finally {
  await page.call('Page.close').catch(() => {}); page.disconnect();
}
