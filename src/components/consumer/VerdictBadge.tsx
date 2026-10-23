import { CircleCheckIcon, ShieldAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { verdictLabels, verdictTone } from '../../utils/verdict';
import type { Verdict } from '../../types/check';

const icons = { good: CircleCheckIcon, caution: TriangleAlertIcon, risk: ShieldAlertIcon };

export function VerdictBadge({ verdict, size = 'sm', label }: {verdict: Verdict;size?: 'sm' | 'lg';label?: string;}) {
  const Icon = icons[verdict];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${label ? 'bg-canvas text-muted' : verdictTone[verdict].badge} ${
      size === 'lg' ? 'h-9 px-3.5 text-sm' : 'h-7 px-2.5 text-xs'}`
      }>
      
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {label || verdictLabels[verdict]}
    </span>);

}
