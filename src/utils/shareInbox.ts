let pendingFiles: File[] = [];
export function putSharedFiles(files: File[]) { pendingFiles = files; }
export function takeSharedFiles() { const files = pendingFiles; pendingFiles = []; return files; }
export const SHARE_INBOX_CACHE = 'pc-share-inbox';
export async function readShareInbox(count: number): Promise<File[]> { if (count <= 0 || !navigator.serviceWorker?.controller)
    return []; const id = new URLSearchParams(window.location.search).get('share_id'); if (!id)
    return []; return new Promise(resolve => { const channel = new MessageChannel(); const timer = window.setTimeout(() => { channel.port1.close(); resolve([]); }, 3000); channel.port1.onmessage = event => { window.clearTimeout(timer); channel.port1.close(); resolve(Array.isArray(event.data) ? event.data.filter((file: unknown) => file instanceof File) : []); }; navigator.serviceWorker.controller!.postMessage({ type: 'READ_SHARE_INBOX', id }, [channel.port2]); }); }
