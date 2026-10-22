import { putSharedFiles } from './shareInbox';
export function clearPrivateState() {
    putSharedFiles([]);
    if (typeof navigator !== 'undefined')
        navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PRIVATE_STATE' });
    try {
        const publicKeys = new Set(['pc-data-saver', 'pc-preferences', 'pc-theme']);
        for (const key of Object.keys(localStorage))
            if (key.startsWith('pc-') && !publicKeys.has(key) && !key.includes('install') && !key.includes('pwa'))
                localStorage.removeItem(key);
    }
    catch { /* Storage may be unavailable. */ }
    if (typeof caches !== 'undefined')
        void caches.keys().then((keys) => Promise.all(keys.filter((key) => key === 'pc-share-inbox' || key.includes('private')).map((key) => caches.delete(key)))).catch(() => { });
}
