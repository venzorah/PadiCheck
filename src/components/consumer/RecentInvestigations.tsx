import { Link } from 'react-router-dom';
import { useInvestigationHistory } from '../../hooks/useInvestigationHistory';
import { apiErrorMessage } from '../../api/client';
import { InvestigationRow } from './InvestigationRow';

export function RecentInvestigations() {
  const history = useInvestigationHistory();
  return <section>
    <div className="flex items-center justify-between"><h2 className="font-semibold text-ink">Recent checks</h2><Link to="/history" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-brand-dark">See all</Link></div>
    {history.loading && <p role="status" className="text-sm text-muted">Loading recent investigations...</p>}
    {Boolean(history.error) && <div role="alert" className="text-sm text-danger">{apiErrorMessage(history.error)}<button type="button" disabled={history.loading} onClick={() => void history.refresh()} className="ml-2 font-semibold">Retry</button></div>}
    {!history.loading && !history.error && !history.rows.length && <p className="rounded-3xl bg-surface p-5 text-sm text-muted">Your investigations will appear here after you submit a check.</p>}
    <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">{history.rows.slice(0, 4).map((row) => <InvestigationRow key={row.investigation_id} investigation={row} />)}</ul>
  </section>;
}
