import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/consumer/PageHeader';
import { InvestigationRow } from '../../components/consumer/InvestigationRow';
import { useInvestigationHistory } from '../../hooks/useInvestigationHistory';
import { apiErrorMessage } from '../../api/client';
import { isActiveInvestigation } from '../../utils/investigations';

export function History() {
  const history = useInvestigationHistory();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const pending = params.get('tab') === 'pending';
  const rows = history.rows.filter((row) => (!pending || isActiveInvestigation(row.status)) && (!query.trim() || (row.title ?? '').toLowerCase().includes(query.trim().toLowerCase())));
  return <>
    <PageHeader title="History" />
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 lg:px-10">
      <div role="tablist" aria-label="History view" className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1">{['all', 'pending'].map((tab) => <button key={tab} role="tab" aria-selected={pending === (tab === 'pending')} onClick={() => setParams(tab === 'pending' ? { tab: 'pending' } : {})} className={`h-11 rounded-xl font-semibold ${pending === (tab === 'pending') ? 'bg-surface text-ink' : 'text-muted'}`}>{tab === 'all' ? 'All checks' : 'In progress'}</button>)}</div>
      <label className="block"><span className="sr-only">Search loaded checks by title</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loaded checks by title" className="h-12 w-full rounded-2xl bg-surface px-4 text-ink ring-1 ring-line" /></label>
      <button type="button" disabled={history.loading} onClick={() => void history.refresh()} className="h-11 rounded-xl px-4 font-semibold text-brand-dark disabled:opacity-50">Refresh</button>
      {Boolean(history.error) && <p role="alert" className="text-sm text-danger">{apiErrorMessage(history.error)}</p>}
      {history.loading && <p role="status" className="text-sm text-muted">Loading investigations...</p>}
      {!history.loading && !history.error && rows.length === 0 && <div className="rounded-3xl bg-surface p-6"><p className="font-semibold text-ink">{history.rows.length ? 'No matching loaded checks' : 'No investigations yet'}</p><p className="mt-2 text-sm text-muted">{history.cursor ? 'Load more checks to continue searching your history.' : 'Start a check to research a link, description or document.'}</p><Link to="/check/any" className="mt-4 inline-block font-semibold text-brand-dark">Start a check</Link></div>}
      <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">{rows.map((row) => <InvestigationRow key={row.investigation_id} investigation={row} />)}</ul>
      {history.cursor && <button type="button" disabled={history.loading} onClick={() => void history.loadMore()} className="h-12 w-full rounded-2xl bg-surface font-semibold text-ink ring-1 ring-line disabled:opacity-50">Load more checks</button>}
      <p className="text-xs text-muted">History contains your own investigations. Search and the in-progress filter apply to the loaded pages. A connection is required.</p>
    </div>
  </>;
}
