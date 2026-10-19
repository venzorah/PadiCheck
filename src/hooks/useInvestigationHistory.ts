import { useCallback, useEffect, useRef, useState } from 'react';
import { investigationsApi } from '../api/investigations';
import { useUser } from '../contexts/UserContext';
import type { Investigation } from '../types/investigation';

export function useInvestigationHistory() {
  const { session } = useUser();
  const [rows, setRows] = useState<Investigation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const controller = useRef<AbortController>();
  const pending = useRef(false);
  const load = useCallback(async (next?: string) => {
    if (!session || (next && pending.current)) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await investigationsApi.list(next, abort.signal);
      if (abort.signal.aborted) return;
      setRows((old) => [...new Map((next ? [...old, ...result.investigations] : result.investigations).map((row) => [row.investigation_id, row])).values()]);
      setCursor(result.next_cursor);
    } catch (failure) { if (!abort.signal.aborted) setError(failure); }
    finally { if (!abort.signal.aborted) { pending.current = false; setLoading(false); } }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows([]); setCursor(null); void load(); return () => controller.current?.abort(); }, [load]);
  return { rows, cursor, loading, error, refresh: () => load(), loadMore: () => cursor ? load(cursor) : Promise.resolve() };
}
