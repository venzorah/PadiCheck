import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircleIcon } from 'lucide-react';
import { AuthShell, authInput } from '../../components/auth/AuthShell';
import { useUser } from '../../contexts/UserContext';
import { apiErrorMessage } from '../../api/client';
import { GoogleSignIn } from '../../components/auth/GoogleSignIn';

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useUser();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const destination = (location.state as { from?: string } | null)?.from;
  const from = destination?.startsWith('/') && !destination.startsWith('//') ? destination : '/';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || googleBusy) return;
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || email.trim().length > 254) return setError('Enter a valid email address.');
    if (password.length < 12 || password.length > 128) return setError('Password must be between 12 and 128 characters.');
    submitting.current = true;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      setPassword('');
      navigate(from, { replace: true });
    } catch (failure) { setError(apiErrorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return (
    <AuthShell title="Sign in" subtitle="Sign in with your verified email and password. Reloading the app ends your local session.">
      <GoogleSignIn action="login" disabled={busy} onBusyChange={setGoogleBusy} onCredential={async (credential) => {
        await signInWithGoogle(credential);
        navigate(from, { replace: true });
      }} />
      <div className="my-5 flex items-center gap-3 text-sm text-muted"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="text-sm font-medium text-ink">Email</span>
          <input required disabled={busy || googleBusy} type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
        </label>
        <label className="block"><span className="text-sm font-medium text-ink">Password</span>
          <input required disabled={busy || googleBusy} type="password" autoComplete="current-password" minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button disabled={busy || googleBusy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-70">
          {busy && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />} Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to PadiCheck? <Link to="/signup" className="font-semibold text-brand-dark">Create an account</Link></p>
      <Link to="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-muted">Having trouble signing in?</Link>
    </AuthShell>
  );
}
