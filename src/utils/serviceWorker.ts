import type { AppId } from '../types/pwa';
// Source for the per-app service workers. Deploy the output as /sw.js (consumer, scope "/")
// and /admin/sw.js (admin, scope "/admin/"). Each app gets its own caches and update cycle.
//
// Caching strategy
// - App shell:       cache-first, versioned
// - Static assets:   cache-first, versioned (hashed filenames)
// - Public content:  stale-while-revalidate
// - Private user data: network-only; no offline report storage
// - Private files, auth, payments: never cached
export function buildServiceWorkerSource(app: AppId, version: string, scope: string): string {
    const shareHandler = app === 'consumer' ?
        `
async function handleShare(request) {
  const form = await request.formData();
  const files = form.getAll('files').filter((f) => typeof f !== 'string');
  const shareId = crypto.randomUUID();
  SHARE_INBOX.set(shareId, files);
  setTimeout(() => SHARE_INBOX.delete(shareId), 120000);
  const params = new URLSearchParams();
  ['title', 'text', 'url'].forEach((k) => { const v = form.get(k); if (v) params.set(k, v); });
  if (files.length) { params.set('files', String(files.length)); params.set('share_id', shareId); }
  return Response.redirect(new URL('/share-target?' + params.toString(), self.location.origin).href, 303);
}` :
        '';
    return `
const SHARE_INBOX = new Map();
const VERSION = '${version}';
const SCOPE = '${scope}';
const PREFIX = 'pc-${app}-';
const SHELL_CACHE = PREFIX + 'shell-' + VERSION;
const STATIC_CACHE = PREFIX + 'static-' + VERSION;
const PUBLIC_CACHE = PREFIX + 'public';
const NEVER_CACHE = [/^\\/v1(?:\\/|$)/, /\\/share-inbox\\//, /\\/api\\/auth/, /\\/api\\/payments/, /\\/api\\/admin/, /\\/files\\/private/, /\\/api\\/me/];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll([SCOPE])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k === 'pc-share-inbox' || (k.startsWith(PREFIX) && k !== PUBLIC_CACHE && !k.endsWith(VERSION)))
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_PRIVATE_STATE') SHARE_INBOX.clear();
  if (event.data && event.data.type === 'READ_SHARE_INBOX' && event.ports[0]) { const files = SHARE_INBOX.get(event.data.id) || []; SHARE_INBOX.delete(event.data.id); event.ports[0].postMessage(files); }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  ${app === 'consumer' ? "if (request.method === 'POST' && url.pathname === '/share-target') { event.respondWith(handleShare(request)); return; }" : ''}
  if (request.method !== 'GET' || NEVER_CACHE.some((rule) => rule.test(url.pathname))) return;
  if (url.search) return; // Signed downloads and query-bearing resources stay network-only.
  if (request.headers.get('Authorization') || request.credentials === 'include') return;

  if (request.mode === 'navigate') {
    event.respondWith(caches.match(SCOPE).then((shell) => shell || fetch(request)));
    return;
  }
  if (/\\.(js|css|woff2?|png|svg|webp|jpg|ico)$/.test(url.pathname)) {
    event.respondWith(caches.open(STATIC_CACHE).then((cache) => cache.match(request).then((hit) =>
      hit || fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }))));
    return;
  }
  if (url.pathname.startsWith('/api/public/')) {
    event.respondWith(caches.open(PUBLIC_CACHE).then((cache) => cache.match(request).then((hit) => {
      const network = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }).catch(() => hit);
      return hit || network;
    })));
  }
});
${shareHandler}

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || '${app === 'admin' ? 'PadiCheck Admin' : 'PadiCheck'}', {
    body: data.body,
    tag: data.tag,
    icon: data.icon,
    data: { url: data.url || SCOPE },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || SCOPE;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((c) => c.url.includes(SCOPE));
    if (existing) { existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  }));
});
`;
}
