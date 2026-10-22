import { putSharedFiles } from './shareInbox';
export function clearPrivateState() {
    putSharedFiles([]);
    if (typeof navigator !== 'undefined')
        navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PRIVATE_STATE' });
    try {
        const publicKeys = new Set(['pc-data-saver', 'pc-preferences', 'pc-theme', 'pc-theme-v2', 'pc-consumer-install', 'pc-admin-install', 'pc-install-events']);
        for (const key of Object.keys(localStorage))
            if (key.startsWith('pc-') && !publicKeys.has(key))
                localStorage.removeItem(key);
    }
    catch { /* Storage may be unavailable. */ }
    try { for (const key of Object.keys(sessionStorage)) if (key.startsWith('pc-') && key !== 'pc-checkout-id') sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    if (typeof caches !== 'undefined')
        void caches.keys().then((keys) => Promise.all(keys.filter((key) => key === 'pc-share-inbox' || key.includes('private')).map((key) => caches.delete(key)))).catch(() => undefined);
}
