import { useEffect, useRef, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { authApi } from '../../api/auth';
import { googleErrorMessage, loadGoogleIdentity } from '../../utils/googleIdentity';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

export function GoogleSignIn({ action, onCredential, disabled = false, onBusyChange, signup = false }: {
  action: 'login' | 'link'; onCredential: (credential: string) => Promise<void>;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void; signup?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController>();
  const timer = useRef<number>();
  const generation = useRef(0);
  const inFlight = useRef(false);
  const callback = useRef(onCredential);
  const busyCallback = useRef(onBusyChange);
  callback.current = onCredential;
  busyCallback.current = onBusyChange;

  const reset = () => {
    generation.current++;
    inFlight.current = false;
    controller.current?.abort();
    window.clearTimeout(timer.current);
    container.current?.replaceChildren();
    window.google?.accounts.id.cancel();
    setState('idle');
    busyCallback.current?.(false);
  };
  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
    window.clearTimeout(timer.current);
    window.google?.accounts.id.cancel();
  }, []);

  const start = async () => {
    if (!clientId || disabled || state !== 'idle' || inFlight.current) return;
    inFlight.current = true;
    const attempt = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setError('');
    setState('loading');
    busyCallback.current?.(true);
    try {
      const sdk = await loadGoogleIdentity();
      if (attempt !== generation.current) return;
      const challenge = await authApi.googleChallenge(action, abort.signal);
      if (attempt !== generation.current || !container.current) return;
      const expiresAt = Date.now() + challenge.expires_in * 1000;
      let consumed = false;
      sdk.initialize({
        client_id: clientId, nonce: challenge.nonce, ux_mode: 'popup', auto_select: false,
        callback: async ({ credential }) => {
          if (attempt !== generation.current || consumed) return;
          consumed = true;
          window.clearTimeout(timer.current);
          container.current?.replaceChildren();
          setState('submitting');
          try {
            if (Date.now() >= expiresAt) throw new Error('Google sign-in expired. Please try again.');
            if (!credential) throw new Error('Google did not return a sign-in credential. Please try again.');
            await callback.current(credential);
            if (attempt === generation.current) { setState('success'); busyCallback.current?.(false); }
          } catch (failure) {
            if (attempt !== generation.current) return;
            reset();
            setError(googleErrorMessage(failure));
          }
        },
      });
      sdk.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', text: signup ? 'signup_with' : 'continue_with', width: Math.min(400, container.current.clientWidth || 300) });
      setState('ready');
      timer.current = window.setTimeout(() => {
        if (attempt !== generation.current) return;
        reset();
        setError('Google sign-in expired. Please try again.');
      }, challenge.expires_in * 1000);
    } catch (failure) {
      if (attempt !== generation.current) return;
      reset();
      setError(googleErrorMessage(failure));
    }
  };

  if (!clientId) return <button type="button" disabled title="Google sign-in is not configured yet" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-ink ring-1 ring-line transition-colors hover:bg-canvas disabled:opacity-60"><span className="text-lg font-bold text-[#4285F4]" aria-hidden="true">G</span>{action === 'link' ? 'Link Google account' : signup ? 'Create account with Google' : 'Continue with Google'}</button>;
  return (
    <div className="space-y-3">
      {(state === 'idle' || state === 'loading') && <button type="button" disabled={disabled || state === 'loading'} onClick={() => void start()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-ink ring-1 ring-line disabled:opacity-50">
        {state === 'loading' && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {state === 'idle' && <span className="text-lg font-bold text-[#4285F4]" aria-hidden="true">G</span>}
        {action === 'link' ? 'Link Google account' : signup ? 'Create account with Google' : 'Continue with Google'}
      </button>}
      <div ref={container} />
      {(state === 'ready' || state === 'loading') && <button type="button" onClick={reset} className="text-sm font-semibold text-muted">Cancel Google {action === 'link' ? 'linking' : 'sign-in'}</button>}
      {state === 'submitting' && <p role="status" className="text-sm text-muted">{action === 'link' ? 'Linking Google account...' : signup ? 'Creating your account...' : 'Signing in...'}</p>}
      {state === 'success' && action === 'link' && <p role="status" className="text-sm text-brand-dark">Your Google account is linked.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
