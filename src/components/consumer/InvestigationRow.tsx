import { Link } from 'react-router-dom';
import { FileSearchIcon } from 'lucide-react';
import type { Investigation } from '../../types/investigation';
import { investigationLabels, statusLabels } from '../../utils/investigations';

export function InvestigationRow({ investigation: row }: { investigation: Investigation }) {
  return <li><Link to={`/result/${row.investigation_id}`} className="flex min-h-[80px] items-center gap-3 px-4 py-3 hover:bg-canvas">
    <FileSearchIcon className="h-6 w-6 shrink-0 text-brand-dark" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{row.title || investigationLabels[row.investigation_type]}</p><p className="mt-1 text-sm text-muted">{new Date(row.created_at).toLocaleString()} · {investigationLabels[row.investigation_type]}</p></div><span className="text-sm text-muted">{statusLabels[row.status]}</span>
  </Link></li>;
}
