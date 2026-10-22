import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { businessTeamsApi } from '../../api/businessTeams';
import { useApiData } from '../../hooks/useApiData';
import { SimpleForm, ApiState, inputStyle, panelStyle } from '../../components/ApiUI';
import type { PublicBusinessDetail } from '../../api/directory';
export function BusinessProfileEdit() {
  const [params] = useSearchParams();
  const location = useLocation();
  const id = params.get('business_profile_id');
  const viewer = (location.state as { businessRole?: string } | null)?.businessRole === 'viewer';
  const state = useApiData<PublicBusinessDetail>(id ? `/v1/directory/${encodeURIComponent(id)}` : null, false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(false), [id]);
  return <section className={panelStyle}>
    <h1 className="text-xl font-bold text-ink">Edit business profile</h1>
    {!id && <p className="text-muted">Choose a business from the directory or your invitations/verification records. Automatic owned-business discovery is unavailable.</p>}
    <ApiState {...state} />
    {viewer && <p className="text-sm text-muted">Your accepted invitation grants viewer access. Profile editing is unavailable for viewers.</p>}
    {id && state.data && !viewer && <SimpleForm label="Save description and category" submit={async data => {
      await businessTeamsApi.profile(id, String(data.get('category')), String(data.get('description')).trim() || null);
      setSaved(true); state.refresh();
    }}>
      <p className="text-sm text-muted">Only the owner, manager or editor may change these fields. The backend checks current access. Ownership and verification are controlled separately.</p>
      <label>Category<input name="category" required maxLength={100} defaultValue={state.data.business.business_category} className={inputStyle} /></label>
      <label>Description<textarea name="description" maxLength={5000} defaultValue={state.data.business.profile_description || ''} className={inputStyle} /></label>
    </SimpleForm>}
    {saved && <p role="status" className="text-brand-dark">Profile saved.</p>}
  </section>;
}
