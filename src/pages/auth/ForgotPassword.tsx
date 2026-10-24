import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircleIcon, MailCheckIcon } from 'lucide-react';
import { authApi, type Challenge } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import { AuthShell, authInput } from '../../components/auth/AuthShell';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [challenge,setChallenge]=useState<(Challenge&{expiresAt:number})|null>(null);
  const lock=useRef(false);
  const [state,setState] = useState<'idle' | 'sending' | 'sent' | 'limited'>('idle');
  const [error, setError] = useState('');

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();if(lock.current)return;setError('');
    if(!/^\S+@\S+\.\S+$/.test(email.trim())){setError('Enter a valid email address');return;}
    lock.current=true;setState('sending');
    try{const result=await authApi.requestPasswordReset(email.trim());setChallenge({...result,expiresAt:Date.now()+result.expires_in*1000});setState('sent');}
    catch(error){setError(apiErrorMessage(error));setState('idle');}finally{lock.current=false;}
};

  return (
    <AuthShell title="Reset your password" subtitle={state === 'sent' ? undefined : 'We will email you a code to choose a new password.'}>
      {state === 'sent' ?
      <div role="status">
          <MailCheckIcon className="h-12 w-12 text-brand" aria-hidden="true" />
          <p className="mt-3 text-ink">
            If an account exists for <strong>{email}</strong>, a reset code has been queued. It expires in 10 minutes.
          </p>
          <button type="button" onClick={() => send()} className="mt-6 h-12 w-full rounded-2xl font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Resend email
          </button>
          <Link to="/reset-password" state={{email:email.trim(),challenge_id:challenge?.challenge_id,expiresAt:challenge?.expiresAt}} className="mt-3 block text-center text-sm font-semibold text-brand-dark">
            Enter your reset code
          </Link>
        </div> :

      <form onSubmit={send} noValidate className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} className={authInput} />
          </label>
          {error &&
        <p role="alert" className="text-sm text-danger">
              {error}
            </p>
        }
          {state === 'limited' &&
        <p role="alert" className="rounded-2xl bg-amber-soft p-3 text-sm text-amber">
              Too many requests. For your security, please wait 15 minutes before trying again.
            </p>
        }
          <button type="submit" disabled={state === 'sending' || state === 'limited'} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {state === 'sending' && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />} Send reset code
          </button>
          <Link to="/recover" className="block text-center text-sm font-semibold text-muted hover:text-ink">
            No access to your email? Recover your account
          </Link>
        </form>
      }
      <p className="mt-6 text-center text-sm">
        <Link to="/signin" className="font-semibold text-brand-dark">
          Back to log in
        </Link>
      </p>
    </AuthShell>);

}