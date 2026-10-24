import { Link } from 'react-router-dom';
import { WifiOffIcon } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';

interface ConfirmCheckSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  checkLabel: string;
  summary: string;
  cost: number;
  credits: number;
  online: boolean;
  ready?: boolean;
}

export function ConfirmCheckSheet({ open, onClose, onConfirm, checkLabel, summary, cost, credits, online, ready=true }: ConfirmCheckSheetProps) {
  const short = credits < cost;
  const primaryClass = 'flex h-12 w-full items-center justify-center rounded-2xl font-semibold transition-colors';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={online ? 'Ready to check?' : 'Connection needed'}
      footer={
      short && online ?
      <Link to="/credits" onClick={onClose} className={`${primaryClass} bg-ink text-white hover:bg-ink-soft`}>
            Get credits
          </Link> :

      <button type="button" disabled={!online||!ready} onClick={onConfirm} className={`${primaryClass} bg-brand text-white hover:bg-brand-dark disabled:opacity-50`}>
            {online ? Number.isFinite(cost) ? `Analyze \u00b7 ${cost} credit${cost > 1 ? 's' : ''}` : 'Analyze' : 'Needs connection'}
          </button>

      }>
      
      <dl className="divide-y divide-line rounded-2xl bg-canvas">
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-muted">Check</dt>
          <dd className="text-right font-medium text-ink">{checkLabel}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="shrink-0 text-muted">What</dt>
          <dd className="min-w-0 truncate text-right font-medium text-ink">{summary}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-muted">Cost</dt>
          <dd className="font-medium text-ink">
            {Number.isFinite(cost) ? `${cost} credit${cost > 1 ? 's' : ''}` : 'Confirmed by server'}
          </dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-muted">Balance after</dt>
          <dd className={`font-medium ${short ? 'text-danger' : 'text-ink'}`}>{Number.isFinite(credits) && Number.isFinite(cost) ? short ? `You have ${credits}` : credits - cost : 'Balance unavailable'}</dd>
        </div>
      </dl>
      {!online &&
      <p className="mt-4 flex gap-2 rounded-2xl bg-caution-soft p-4 text-sm text-caution">
          <WifiOffIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Reconnect to submit this check. Files have not been uploaded.
        </p>
      }
      {short && online && <p className="mt-4 text-sm text-danger">You need {cost - credits} more credit{cost - credits > 1 ? 's' : ''} for this check.</p>}
    </BottomSheet>);

}
