import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '../../components/consumer/PageHeader';
import { GoogleSignIn } from '../../components/auth/GoogleSignIn';
import { Action, ApiState, SimpleForm, inputStyle, panelStyle } from '../../components/ApiUI';
import { useUser } from '../../contexts/UserContext';
import { useApiData } from '../../hooks/useApiData';
import { securityApi, type SessionRecord, type RecoveryResult } from '../../api/security';
import { authApi, type Challenge } from '../../api/auth';
import { api } from '../../api/client';
export function Security() {
    const { session, clearSession, completeSecurity } = useUser();
    const navigate = useNavigate();
    const sessions = useApiData<{
        sessions: SessionRecord[];
    }>('/v1/auth/sessions');
    const mfa = useApiData<{
        enabled: boolean;
        recovery_codes_remaining: number;
    }>('/v1/auth/mfa');
    const [setup, setSetup] = useState<{
        secret: string;
        otpauth_uri: string;
        expires_in: number;
    } | null>(null);
    const [emailChallenge, setEmailChallenge] = useState<(Challenge & {
        requestedAt: number;
    }) | null>(null);
    useEffect(() => { if (!setup)
        return; const timer = window.setTimeout(() => setSetup(null), setup.expires_in * 1000); return () => window.clearTimeout(timer); }, [setup]);
    const finish = (result: RecoveryResult) => { setSetup(null); completeSecurity(result.recovery_codes); navigate('/security-complete', { replace: true }); };
    return <><PageHeader title="Security & privacy" back="/account"/><div className="mx-auto max-w-3xl space-y-5 px-4 pb-10">
    <section className={panelStyle}><h2 className="font-semibold text-ink">Account security</h2><p className="text-muted">{session?.email}</p><p className="text-sm text-muted">Sensitive changes require signing in within the last five minutes. Sessions expire after 15 minutes; reload requires sign-in.</p><Link to="/signin" state={{ from: '/account/security' }} className="font-semibold text-brand-dark">Sign in again for security changes</Link><p className="text-sm text-muted">Password reset/change, personal profile editing, Google unlink, deletion and account export are unavailable.</p></section>
    {!session?.emailVerified && <section className={panelStyle}><h2 className="font-semibold text-ink">Verify your account email</h2><Action run={async () => { const result = await api<Challenge>('/v1/auth/email/request', { method: 'POST', auth: true }); setEmailChallenge({ ...result, requestedAt: Date.now() }); }}>Request email code</Action>{emailChallenge && <SimpleForm label="Verify email" submit={async (data) => { await api('/v1/auth/email/verify', { method: 'POST', auth: true, json: { email: session?.email, challenge_id: emailChallenge.challenge_id, code: String(data.get('code')) } }); clearSession(); navigate('/signin', { state: { from: '/account/security' } }); }}><p className="text-sm text-muted">{emailChallenge.message} Codes expire after ten minutes. Wait 60 seconds before requesting another.</p><label>Email code<input name="code" required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={inputStyle}/></label></SimpleForm>}</section>}
    <section className={panelStyle}><h2 className="font-semibold text-ink">Authenticator two-factor authentication</h2><ApiState {...mfa}/>{mfa.data && <><p className="text-sm text-muted">{mfa.data.enabled ? `Enabled. Recovery codes remaining: ${mfa.data.recovery_codes_remaining}` : 'Not enabled.'}</p>{!mfa.data.enabled && session?.emailVerified && <Action run={async () => setSetup(await securityApi.setup())}>Set up authenticator</Action>}{setup && <div className="space-y-4"><p className="text-sm text-muted">Scan this QR in your authenticator. This secret is shown locally and expires in ten minutes.</p><div className="inline-block rounded-xl bg-white p-4"><QRCodeSVG value={setup.otpauth_uri} size={192}/></div><p className="break-all font-mono text-ink">{setup.secret}</p><SimpleForm label="Enable MFA" submit={async (data) => finish(await securityApi.confirm(String(data.get('code'))))}><label>Authenticator code<input name="code" required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={inputStyle}/></label></SimpleForm><button type="button" onClick={() => setSetup(null)} className="text-muted">Cancel setup</button></div>}{mfa.data.enabled && <><SimpleForm label="Regenerate recovery codes and sign out" submit={async (data) => finish(await securityApi.regenerate(String(data.get('code')).trim().toLowerCase()))}><label>Authenticator or recovery code<input name="code" required pattern="([0-9]{6}|[a-fA-F0-9]{24})" autoComplete="one-time-code" className={inputStyle}/></label></SimpleForm><SimpleForm label="Disable MFA and sign out" submit={async (data) => { if (window.confirm('Disable two-factor authentication?'))
        finish(await securityApi.disable(String(data.get('code')).trim().toLowerCase())); }}><label>Authenticator or recovery code<input name="code" required pattern="([0-9]{6}|[a-fA-F0-9]{24})" autoComplete="one-time-code" className={inputStyle}/></label></SimpleForm></>}</>}</section>
    <section className={panelStyle}><h2 className="font-semibold text-ink">Active sessions</h2><ApiState {...sessions}/>{sessions.data?.sessions.map((row) => <div key={row.session_id} className="space-y-2 border-t border-line pt-3"><p className="text-sm text-ink">{row.is_current ? 'Current session' : 'Other session'} · Signed in {new Date(row.authenticated_at).toLocaleString()}</p><p className="text-xs text-muted">Expires {new Date(row.expires_at).toLocaleString()}</p><Action danger run={async () => { await securityApi.revoke(row.session_id); if (row.is_current) {
        clearSession();
        navigate('/signin');
    }
    else
        sessions.refresh(); }}>Revoke session</Action></div>)}<Action danger run={async () => { await securityApi.logoutAll(); clearSession(); navigate('/signin'); }}>Log out of all sessions</Action></section>
    <section className={panelStyle}><h2 className="font-semibold text-ink">Link Google account</h2><p className="text-sm text-muted">Choose the same verified email as your PadiCheck account.</p><GoogleSignIn action="link" disabled={!session?.emailVerified} onCredential={async (credential) => { const result = await authApi.linkGoogle(credential); if (!result.linked)
        throw new Error('Link was not confirmed.'); }}/></section>
  </div></>;
}
