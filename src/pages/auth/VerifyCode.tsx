import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoaderCircleIcon } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { OtpInput } from '../../components/auth/OtpInput';
import { useUser } from '../../contexts/UserContext';
import { apiErrorMessage, ApiError } from '../../api/client';

export function VerifyCode() {
  const { pendingSignup, verifySignup, resendSignup } = useUser();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!pendingSignup) return (
    <AuthShell title="Start signup again" subtitle="There is no pending email verification on this page. Reloading the app clears signup details.">
      <Link to="/signup" className="font-semibold text-brand-dark">Create an account</Link>
      <Link to="/signin" className="mt-4 block font-semibold text-brand-dark">Sign in instead</Link>
    </AuthShell>
  );
  const cooldown = Math.max(0, Math.ceil((Math.max(pendingSignup.requestedAt + 60000, retryAt) - now) / 1000));
  const expired = now >= pendingSignup.requestedAt + pendingSignup.expires_in * 1000;
  const run = async (resend: boolean) => {
    if (submitting.current || (resend ? cooldown > 0 : !/^\d{6}$/.test(code))) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      if (resend) { await resendSignup(); setCode(''); setNow(Date.now()); }
      else { await verifySignup(code); navigate('/', { replace: true }); }
    } catch (failure) {
      setError(apiErrorMessage(failure));
      if (failure instanceof ApiError && failure.status === 429) {
        const raw = failure.retryAfter;
        const delay = raw && /^\d+$/.test(raw) ? Number(raw) * 1000 : raw ? Date.parse(raw) - Date.now() : 60000;
        setRetryAt(Date.now() + (Number.isFinite(delay) ? Math.max(1000, delay) : 60000));
      }
    } finally { submitting.current = false; setBusy(false); }
  };
  return (
    <AuthShell title="Verify your email" subtitle={`Enter the six-digit signup code for ${pendingSignup.email}.`}>
      <p className="mb-4 text-sm text-muted">{pendingSignup.message}</p>
      <form onSubmit={(event) => { event.preventDefault(); void run(false); }}>
        <OtpInput value={code} onChange={setCode} disabled={busy || expired} invalid={Boolean(error)} />
        {expired && <p className="mt-3 text-sm text-danger">This code has expired. Request a new one.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <button disabled={busy || expired || code.length !== 6 || retryAt > now} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white disabled:opacity-50">
          {busy && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />} Verify email
        </button>
      </form>
      <button type="button" disabled={busy || cooldown > 0} onClick={() => void run(true)} className="mt-4 h-12 w-full rounded-2xl font-semibold text-ink ring-1 ring-line disabled:opacity-50">
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
      <Link to="/signin" className="mt-4 block text-center text-sm font-semibold text-brand-dark">Already registered? Sign in</Link>
      <Link to="/signup" className="mt-4 block text-center text-sm font-semibold text-muted">Use a different email</Link>
    </AuthShell>
  );
}
