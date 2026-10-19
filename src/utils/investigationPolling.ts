import { ApiError } from '../api/client';
import type { InvestigationDetail } from '../types/investigation';
import { isActiveInvestigation } from './investigations';

export function retryDelay(error: unknown, fallback: number): number {
  if (!(error instanceof ApiError) || !error.retryAfter) return fallback;
  const value = /^\d+$/.test(error.retryAfter) ? Number(error.retryAfter) * 1000 : Date.parse(error.retryAfter) - Date.now();
  return Number.isFinite(value) ? Math.max(1000, value, fallback) : fallback;
}

// Returns one non-overlapping poll loop; callers control visibility and lifetime.
export function startInvestigationPolling(options: {
  read: (signal: AbortSignal) => Promise<InvestigationDetail>;
  onData: (value: InvestigationDetail) => void; onError: (error: unknown) => void;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  unschedule?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  const schedule = options.schedule ?? setTimeout;
  const unschedule = options.unschedule ?? clearTimeout;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const run = async () => {
    try {
      const value = await options.read(controller.signal);
      if (controller.signal.aborted) return;
      failures = 0;
      options.onData(value);
      if (isActiveInvestigation(value.investigation.status)) timer = schedule(() => void run(), value.capabilities.ai_analysis ? 4000 : 15000);
    } catch (error) {
      if (controller.signal.aborted) return;
      options.onError(error);
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return;
      failures++;
      timer = schedule(() => void run(), retryDelay(error, Math.min(60000, 4000 * 2 ** Math.min(failures, 4))));
    }
  };
  void run();
  return () => { controller.abort(); if (timer !== undefined) unschedule(timer); };
}
