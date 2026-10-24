import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleCheckIcon, LinkIcon, LoaderCircleIcon } from 'lucide-react';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import { useUser } from '../../contexts/UserContext';
import { AuthShell, authInput } from '../../components/auth/AuthShell';

export function ResetPassword() {
  const location=useLocation();const {clearSession}=useUser();
  const pending=location.state as {email?:string;challenge_id?:string;expiresAt?:number}|null;
  const tokenState=!pending?.email||!pending.challenge_id?'invalid':Date.now()>Number(pending.expiresAt||0)?'expired':'valid';
  const [code,setCode]=useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [state,setState] = useState<'idle' | 'saving' | 'done'>('idle');

  if (tokenState !== 'valid') {
    return (
      <AuthShell title={tokenState === 'expired' ? 'This code has expired' : 'Request a reset code first'} subtitle="Reset codes work once and expire after 10 minutes.">
        <LinkIcon className="h-10 w-10 text-muted" aria-hidden="true" />
        <Link to="/forgot-password" className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white">
          Request a new code
        </Link>
      </AuthShell>);

  }

  if (state === 'done') {
    return (
      <AuthShell title="Password updated">
        <div role="status">
          <CircleCheckIcon className="h-12 w-12 text-brand" aria-hidden="true" />
          <p className="mt-3 text-ink-soft">For your safety we’ve signed you out on all other devices.</p>
          <Link to="/signin" className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-brand font-semibold text-white">
            Log in
          </Link>
        </div>
      </AuthShell>);

  }

  return (
    <AuthShell title="Choose a new password">
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if(state==='saving')return;
          if(!/^\d{6}$/.test(code))return setError('Enter the six-digit reset code from your email');
          if(password.length<12||password.length>128)return setError('Use between 12 and 128 characters');
          if (password !== confirm) return setError('The passwords don’t match');
          setError('');setState('saving');
          try{await authApi.confirmPasswordReset({email:pending!.email!,challenge_id:pending!.challenge_id!,code,new_password:password});setCode('');setPassword('');setConfirm('');clearSession();setState('done');}
          catch(error){setError(apiErrorMessage(error));setState('idle');}
        }}
        className="space-y-4">
        
        <label className="block"><span className="text-sm font-medium text-ink">Reset code</span><input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" className={authInput}/></label>
        <label className="block">
          <span className="text-sm font-medium text-ink">New password</span>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Confirm password</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={authInput} />
        </label>
        {error &&
        <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        }
        <button type="submit" disabled={state === 'saving'} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white disabled:opacity-60">
          {state === 'saving' && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />} Update password
        </button>
      </form>
    </AuthShell>);

}