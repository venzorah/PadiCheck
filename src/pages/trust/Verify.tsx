import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/consumer/PageHeader';
import { RecentInvestigations } from '../../components/consumer/RecentInvestigations';
import { entityTypes } from '../../data/entityTypes';

export function Verify() {
  return <>
    <PageHeader title="Check Now" back="/" />
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:px-10">
      <section><h2 className="text-[26px] font-bold text-ink lg:text-4xl">What would you like to research?</h2><p className="mt-3 text-sm text-muted">Choose a context. Research returns available evidence and limitations; it does not guarantee identity or safety.</p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{entityTypes.map((type) => <li key={type.id}><Link to={`/verify/${type.id}`} className="flex min-h-[112px] flex-col justify-between gap-3 rounded-3xl bg-surface p-4 ring-1 ring-line"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${type.tile}`}><type.icon className="h-5 w-5" /></span><span className="font-semibold text-ink">{type.label}</span></Link></li>)}</ul>
      </section><aside className="mt-8 lg:mt-0"><RecentInvestigations /></aside>
    </div>
  </>;
}
