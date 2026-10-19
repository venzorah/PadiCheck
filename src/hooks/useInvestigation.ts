import { useEffect, useState } from 'react';
import { investigationsApi } from '../api/investigations';
import { useUser } from '../contexts/UserContext';
import type { InvestigationDetail } from '../types/investigation';
import { startInvestigationPolling } from '../utils/investigationPolling';

export function useInvestigation(id: string) {
  const { session } = useUser();
  const [data, setData] = useState<InvestigationDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setData(null);
    setError(null);
    if (!id || !session) return;
    let stop: (() => void) | undefined;
    const resume = () => {
      stop?.();
      if (document.hidden) return;
      stop = startInvestigationPolling({ read: (signal) => investigationsApi.detail(id, signal), onData: (next) => { setData(next); setError(null); }, onError: setError });
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    return () => { stop?.(); document.removeEventListener('visibilitychange', resume); };
  }, [id, session?.id, revision]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, refresh: () => setRevision((value) => value + 1) };
}
