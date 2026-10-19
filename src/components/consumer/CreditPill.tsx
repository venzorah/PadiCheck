import { Link } from 'react-router-dom';
import { HistoryIcon } from 'lucide-react';

export function CreditPill() {
  return <Link to="/history" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink ring-1 ring-line lg:hidden"><HistoryIcon className="h-4 w-4" aria-hidden="true" />History</Link>;
}
