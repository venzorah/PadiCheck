import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell, authInput } from '../../components/auth/AuthShell';
import { useUser } from '../../contexts/UserContext';
import { ApiError, apiErrorMessage } from '../../api/client';
import { buttonStyle } from '../../components/ApiUI';
export function MfaLogin() {
    const { pendingMfa, verifyMfa, cancelMfa } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [now, setNow] = useState(Date.now());
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
    const expired = !pendingMfa || now >= pendingMfa.expiresAt;
    const destination = (location.state as {
        from?: string;
    } | null)?.from;
    return <AuthShell title="Two-factor sign-in" subtitle="Enter your authenticator code or a recovery code.">
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {expired ? <><p className="text-muted">The challenge expired, was exhausted or is unavailable. Start a new sign-in deliberately.</p><Link to="/signin" onClick={cancelMfa} className="mt-4 block text-brand-dark">Back to sign in</Link></> : <form className="space-y-4" onSubmit={async (event) => {
                event.preventDefault();
                if (busy)
                    return;
                setBusy(true);
                setError('');
                try {
                    await verifyMfa(code.trim().toLowerCase());
                    setCode('');
                    navigate(destination?.startsWith('/') && !destination.startsWith('//') ? destination : '/', { replace: true });
                }
                catch (failure) {
                    setCode('');
                    setError(failure instanceof ApiError && failure.code === 'invalid_mfa_code' ? 'That second-factor code is invalid or has already been used.' : apiErrorMessage(failure));
                    if (failure instanceof ApiError && ['invalid_mfa_challenge', 'mfa_rate_limited'].includes(failure.code))
                        cancelMfa();
                }
                finally {
                    setBusy(false);
                }
            }}><label className="block text-sm text-ink">Authenticator or recovery code<input autoComplete="one-time-code" autoCapitalize="none" required pattern="([0-9]{6}|[a-fA-F0-9]{24})" maxLength={24} value={code} disabled={busy} onChange={(event) => setCode(event.target.value)} className={authInput}/></label><p className="text-sm text-muted">Expires in {Math.max(0, Math.ceil((pendingMfa.expiresAt - now) / 1000))} seconds.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<button disabled={busy} className={`${buttonStyle} w-full`}>Verify sign-in</button><Link to="/signin" onClick={cancelMfa} className="block text-sm text-muted">Cancel and restart sign-in</Link></form>}
  </AuthShell>;
}
export function SecurityComplete() {
    const { securityCodes, dismissSecurityCodes } = useUser();
    return <AuthShell title="Sign in again" subtitle="Your security change revoked all sessions.">{securityCodes.length > 0 && <section className="space-y-3"><p className="text-sm text-ink">Save these recovery codes privately. They will not be shown again.</p><div className="space-y-2 rounded-2xl bg-surface p-4 font-mono text-sm text-ink">{securityCodes.map((code) => <p key={code}>{code}</p>)}</div><p className="text-sm text-muted">If you just enabled MFA, wait for the next authenticator code before signing in, or use a recovery code.</p></section>}<Link to="/signin" onClick={dismissSecurityCodes} className={`${buttonStyle} mt-5`}>I saved my codes — sign in</Link></AuthShell>;
}
