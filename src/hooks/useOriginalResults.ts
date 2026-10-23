import { useMemo } from 'react';
import { useInvestigationHistory } from './useInvestigationHistory';
import { investigationView } from '../utils/presentationAdapters';
export function useOriginalResults() {
  const history = useInvestigationHistory();
  const results = useMemo(() => history.rows.map(investigationView), [history.rows]);
  return { ...history, results };
}
