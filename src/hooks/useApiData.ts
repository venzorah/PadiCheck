import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { api } from '../api/client';
export function useApiData<T>(path: string | null, auth = true) {
    const { session } = useUser();
    const [state, setState] = useState<{
        data: T | null;
        error: unknown;
        loading: boolean;
    }>({ data: null, error: null, loading: true });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const abort = new AbortController();
        setState({ data: null, error: null, loading: Boolean(path) });
        if (!path || (auth && !session)) {
            setState({ data: null, error: null, loading: false });
            return;
        }
        void api<T>(path, { auth, signal: abort.signal }).then((data) => { if (!abort.signal.aborted)
            setState({ data, error: null, loading: false }); }).catch((error) => { if (!abort.signal.aborted)
            setState({ data: null, error, loading: false }); });
        return () => abort.abort();
    }, [path, auth, session?.id, revision]); // eslint-disable-line react-hooks/exhaustive-deps
    return { ...state, refresh: () => setRevision((value) => value + 1) };
}
