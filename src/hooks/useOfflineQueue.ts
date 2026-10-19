import { useCallback, useEffect, useState } from 'react';
import { makeId } from '../utils/checks';
import type { QueuedTask } from '../types/check';

export interface OfflineQueueApi {
  queue: QueuedTask[];
  enqueue: (task: Omit<QueuedTask, 'id' | 'status' | 'createdAt'>) => QueuedTask;
  remove: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
}
const unavailable = 'Offline submission is unavailable. Reconnect and submit the original input from a new check.';
export function useOfflineQueue(): OfflineQueueApi {
  const [queue, setQueue] = useState<QueuedTask[]>([]);
  useEffect(() => { try { localStorage.removeItem('pc-offline-queue'); } catch { /* Storage may be blocked. */ } }, []);
  const enqueue = useCallback((task: Omit<QueuedTask, 'id' | 'status' | 'createdAt'>) => {
    const row: QueuedTask = { ...task, id: makeId('q'), status: 'failed', error: unavailable, createdAt: new Date().toISOString() };
    setQueue((old) => [row, ...old]);
    return row;
  }, []);
  return { queue, enqueue, remove: (id) => setQueue((old) => old.filter((row) => row.id !== id)), retry: (id) => setQueue((old) => old.map((row) => row.id === id ? { ...row, status: 'failed', error: unavailable } : row)), clearFinished: () => setQueue([]) };
}
