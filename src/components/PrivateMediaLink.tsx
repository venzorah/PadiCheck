import {useEffect,useRef,useState} from 'react';
import {mediaApi} from '../api/media';
import {ApiError,apiErrorMessage} from '../api/client';
import {safeHttpUrl} from '../utils/investigations';
export function PrivateMediaLink({ id }: {
    id: string;
}) {
    const [delivery, setDelivery] = useState<{
        url: string;
        expires_at: number;
    } | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const controller = useRef<AbortController>();
    useEffect(() => () => controller.current?.abort(), []);
    useEffect(() => {
        if (!delivery)
            return;
        const timer = window.setTimeout(() => setDelivery(null), Math.max(0, delivery.expires_at * 1000 - Date.now()));
        return () => window.clearTimeout(timer);
    }, [delivery]);
    const prepare = async () => {
        if (busy)
            return;
        setBusy(true);
        setError('');
        const abort = new AbortController();
        controller.current = abort;
        try {
            const response = await mediaApi.delivery(id, abort.signal);
            if (!safeHttpUrl(response.url) || response.expires_at * 1000 <= Date.now())
                throw new Error('The private file link is unavailable. Request another link.');
            setDelivery(response);
        }
        catch (failure) {
            if (!abort.signal.aborted)
                setError(failure instanceof ApiError ? apiErrorMessage(failure) : 'Could not prepare a private file link.');
        }
        finally {
            if (!abort.signal.aborted)
                setBusy(false);
        }
    };
    return <div className="mt-2 text-sm">
    {delivery ? <a href={delivery.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={(event) => { if (delivery.expires_at * 1000 <= Date.now()) {
        event.preventDefault();
        setDelivery(null);
    } }} className="font-semibold text-brand-dark">Open private file (temporary link)</a> : <button type="button" disabled={busy} onClick={() => void prepare()} className="font-semibold text-brand-dark disabled:opacity-50">{busy ? 'Preparing file...' : 'View private file'}</button>}
    {error && <p role="alert" className="mt-1 text-danger">{error}</p>}
  </div>;
}
