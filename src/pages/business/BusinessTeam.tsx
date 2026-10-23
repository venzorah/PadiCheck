import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { BottomSheet } from '../../components/BottomSheet';
import { Field } from '../../components/admin/Field';
import { useTrust } from '../../contexts/TrustContext';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { businessTeamsApi, type Team, type Invitation } from '../../api/businessTeams';
import { apiErrorMessage } from '../../api/client';
import { ApiState } from '../../components/ApiUI';
import { planById } from '../../data/plans';
import { chipClass, inputClass, primaryButton } from '../../utils/formStyles';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner'|'Admin'|'Member'|'Viewer';
  status: 'active' | 'invited';
}

const roleHints = { Viewer: 'Read-only business access', Owner: 'Everything, including billing and deleting the business', Admin: 'Edit profile, reply to reviews, manage disputes', Member: 'View dashboard and reply to reviews' };

export function BusinessTeam() {
  const { session } = useUser();
  const navigate=useNavigate();
  const invitations=useApiData<{invitations:Invitation[]}>('/v1/me/business-invitations?limit=100&offset=0');
  const [editing,setEditing]=useState<Member|null>(null);
  const { myBusiness, subscription }=useTrust();
  const id=myBusiness.id;
  const state=useApiData<Team>(id?'/v1/businesses/'+encodeURIComponent(id)+'/team':null);
  const members:Member[]=[...(state.data?[{id:state.data.owner_user_id,name:session?.id===state.data.owner_user_id?session.name:'Business owner',email:'',role:'Owner' as const,status:'active' as const}]:[]),...(state.data?.members||[]).map(row=>({id:row.users_id,name:row.display_name,email:'',role:row.member_role==='manager'?'Admin' as const:row.member_role==='viewer'?'Viewer' as const:'Member' as const,status:'active' as const})),...(state.data?.invitations||[]).filter(row=>!row.accepted_at&&!row.revoked_at&&Date.parse(row.expires_at)>Date.now()).map(row=>({id:row.invitation_id,name:row.email||'Invited member',email:row.email||'',role:row.member_role==='manager'?'Admin' as const:row.member_role==='viewer'?'Viewer' as const:'Member' as const,status:'invited' as const}))];
  const [busy,setBusy]=useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Member['role']>('Member');
  const [error, setError] = useState('');
  const limit = 100;

  const invite = async () => {
    if(busy||!id)return;if(editing){setBusy(true);try{await businessTeamsApi.role(id,editing.id,role==='Admin'?'manager':role==='Viewer'?'viewer':'editor');state.refresh();setOpen(false);setEditing(null);}catch(error){setError(apiErrorMessage(error));}finally{setBusy(false);}return;}if(!/^\S+@\S+\.\S+$/.test(email))return setError('Enter a valid email');setBusy(true);setError('');
    try{await businessTeamsApi.invite(id,email,role==='Admin'?'manager':role==='Viewer'?'viewer':'editor');state.refresh();setOpen(false);setEmail('');toast.success('Invitation created in PadiCheck');}catch(error){setError(apiErrorMessage(error));}finally{setBusy(false);}
  };

  return (
    <div className="max-w-3xl pb-10"><ApiState loading={state.loading} error={state.error}/>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {members.length} of {limit} seats · {planById(subscription.planId)?.name ?? 'Free'}
        </p>
        <button type="button" onClick={()=>{setEditing(null);setOpen(true);}} disabled={!id||busy} title={!id?'Choose a business from the directory first':undefined} className={`${primaryButton} h-11 px-4`}>
          <PlusIcon className="h-4 w-4" aria-hidden="true" /> Invite
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl bg-surface">
        {members.map((m) =>
        <li key={m.id} className="flex items-center gap-3 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-soft font-semibold text-violet" aria-hidden="true">
              {m.name[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">
                {m.name} {m.status === 'invited' && <span className="text-sm font-normal text-muted">· invited</span>}
              </span>
              <span className="block truncate text-sm text-muted">{m.email}</span>
            </span>
            <button type="button" disabled={m.role==='Owner'||m.status==='invited'} onClick={()=>{setEditing(m);setRole(m.role);setOpen(true);}} className="text-sm font-semibold text-ink-soft">{m.role}</button>
            {m.role !== 'Owner' &&
          <button
            type="button"
            aria-label={`Remove ${m.name}`}
            onClick={async()=>{if(busy)return;setBusy(true);try{if(m.status==='invited')await businessTeamsApi.revoke(id,m.id);else await businessTeamsApi.remove(id,m.id);state.refresh();toast('Member access removed');}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(false);}}}
            className="grid h-11 w-11 place-items-center rounded-xl text-danger hover:bg-danger-soft">
            
                <Trash2Icon className="h-4 w-4" />
              </button>
          }
          </li>
        )}
      </ul>
      {!id&&<ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl bg-surface">{invitations.data?.invitations.map(invitation=><li key={invitation.invitation_id} className="flex items-center gap-3 px-5 py-4"><span className="min-w-0 flex-1 text-sm text-ink">Business invitation <span className="block text-muted">{invitation.member_role}</span></span><button type="button" disabled={busy||!!invitation.accepted_at||!!invitation.revoked_at||Date.parse(invitation.expires_at)<=Date.now()} className="h-11 rounded-xl px-3 text-sm font-semibold text-brand-dark" onClick={async()=>{setBusy(true);try{await businessTeamsApi.accept(invitation.invitation_id);invitations.refresh();navigate('/business/profile?business_profile_id='+invitation.business_profile_id,{state:{businessRole:invitation.member_role}});}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(false);}}}>{invitation.accepted_at?'Accepted':invitation.revoked_at?'Revoked':Date.parse(invitation.expires_at)<=Date.now()?'Expired':'Accept'}</button></li>)}</ul>}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={editing?'Change team role':'Invite a team member'} footer={<button type="button" onClick={()=>void invite()} disabled={busy||!id} className={`${primaryButton} w-full`}>{editing?'Save role':'Send invite'}</button>}>
        <div className="space-y-4">
          <Field label="Email" error={error || undefined}>
            <input disabled={!!editing} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium text-ink">Role</legend>
            <div className="mt-2 flex gap-2">
              {(['Admin', 'Member', 'Viewer'] as const).map((r) =>
              <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={chipClass(role === r)}>
                  {r}
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">{roleHints[role]}</p>
          </fieldset>
        </div>
      </BottomSheet>
    </div>);

}