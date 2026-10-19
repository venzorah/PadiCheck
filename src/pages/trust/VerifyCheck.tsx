import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { entityTypeById } from '../../data/entityTypes';

export function VerifyCheck() {
  const { type = '' } = useParams<{ type: string }>();
  const [params] = useSearchParams();
  if (!entityTypeById(type)) return <Navigate to="/verify" replace />;
  const mode = ['website', 'listing'].includes(type) ? 'link' : 'text';
  const search = new URLSearchParams({ mode });
  const value = params.get('q');
  if (value) search.set(mode === 'link' ? 'url' : 'text', value);
  return <Navigate to={`/check/${type}?${search}`} replace />;
}
