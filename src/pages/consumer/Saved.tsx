import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/consumer/PageHeader';

export function Saved() {
  return <><PageHeader title="Saved" /><div className="mx-auto max-w-3xl px-4 pb-10"><section className="rounded-3xl bg-surface p-6"><h1 className="font-semibold text-ink">Saved investigations are not available yet</h1><p className="mt-2 text-sm text-muted">Use History to return to your investigations. Private reports are not stored offline.</p><Link to="/history" className="mt-4 inline-block font-semibold text-brand-dark">Open history</Link></section></div></>;
}
