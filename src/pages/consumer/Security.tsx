import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, KeyRoundIcon, LaptopIcon, LoaderCircleIcon, ShieldCheckIcon, SmartphoneIcon } from 'lucide-react';
import { BottomSheet } from '../../components/BottomSheet';
import { Switch } from '../../components/Switch';
import { Field } from '../../components/admin/Field';
import { OtpInput } from '../../components/auth/OtpInput';
import { PageHeader } from '../../components/consumer/PageHeader';
import { useUser } from '../../contexts/UserContext';
import { formatWhen } from '../../utils/checks';
import { inputClass, primaryButton } from '../../utils/formStyles';


import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { securityApi, type RecoveryResult } from '../../api/security';
import { useApiData } from '../../hooks/useApiData';
import { apiErrorMessage } from '../../api/client';
import { GoogleSignIn } from '../../components/auth/GoogleSignIn';
import { authApi } from '../../api/auth';

export function Security() {
  const {session,completeSecurity}=useUser();const navigate=useNavigate();
  const sessionData=useApiData<Awaited<ReturnType<typeof securityApi.sessions>>>('/v1/auth/sessions');
  const factor=useApiData<Awaited<ReturnType<typeof securityApi.status>>>('/v1/auth/mfa');
  const sessions=(sessionData.data?.sessions||[]).map(row=>({id:row.session_id,device:row.is_current?'Current session':'Other session',place:'Signed in',lastSeen:row.authenticated_at,current:row.is_current}));
  const twoFactor=factor.data?.enabled||false;const loginAlerts=false;
  const privacy={shareAnonStats:false,showNameOnReviews:false,personalisedTips:false};
  const unavailable=()=>toast('This feature is not available from the backend yet.');
  const setLoginAlerts=unavailable;  const [sheet,setSheet]=useState<null|'password'|'2fa'|'disable2fa'|'google'|'recovery'>(null);
  const [step,setStep]=useState<'scan'|'codes'>('scan');const [code,setCode]=useState('');const [codeError,setCodeError]=useState('');
  const [setup,setSetup]=useState<Awaited<ReturnType<typeof securityApi.setup>>|null>(null);
  const [pw,setPw]=useState({current:'',next:'',confirm:''});const pwError='Password changes are not available yet.';
  const [busy,setBusy]=useState(false);const backupCodes:string[]=[];
  const changePassword=unavailable;const exportData=unavailable;
  const finish=(result:RecoveryResult)=>{setSetup(null);completeSecurity(result.recovery_codes);navigate('/security-complete',{replace:true});};
  useEffect(()=>{if(!setup)return;const timer=setTimeout(()=>{setSetup(null);setSheet(null);},setup.expires_in*1000);return()=>clearTimeout(timer);},[setup]);
  const startSetup=async()=>{if(busy)return;setBusy(true);setCode('');setCodeError('');try{setSetup(await securityApi.setup());setStep('scan');setSheet('2fa');}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(false);}};
  const confirmSetup=async()=>{if(busy||!setup)return;setBusy(true);setCodeError('');try{finish(await securityApi.confirm(code));}catch(error){setCodeError(apiErrorMessage(error));}finally{setBusy(false);}};
  const revoke=async(id:string)=>{try{await securityApi.revoke(id);sessionData.refresh();}catch(error){toast.error(apiErrorMessage(error));}};
  const row = 'flex min-h-[64px] items-center gap-3 px-5 py-3';

  return (
    <>
      <PageHeader title="Security & privacy" back="/account" />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 lg:px-10">
        <section aria-labelledby="signin-heading">
          <h2 id="signin-heading" className="mb-2 text-sm font-medium text-muted">
            Sign-in
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">
            <li className={row}>
              <KeyRoundIcon className="h-5 w-5 text-muted" aria-hidden="true" />
              <span className="flex-1 font-medium text-ink">Password</span>
              <button type="button" onClick={() => setSheet('password')} className="h-11 rounded-xl px-3 text-sm font-semibold text-brand-dark hover:bg-canvas">
                Change
              </button>
            </li>
            <li className={row}>
              <ShieldCheckIcon className="h-5 w-5 text-muted" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-medium text-ink">Two-factor authentication</span>{twoFactor&&<button className="mt-1 text-sm font-semibold text-brand-dark" onClick={()=>{setCode('');setSheet('recovery');}}>Regenerate recovery codes</button>}
                <span className="block text-sm text-muted">{twoFactor ? 'On · authenticator app' : 'Add a second step when you sign in'}</span>
              </span>
              <Switch
                checked={twoFactor}
                disabled={busy||factor.loading}
                onChange={(on)=>{if(on)void startSetup();else{setCode('');setCodeError('');setSheet('disable2fa');}}}
                label="Two-factor authentication" />
              
            </li>
            <li className={row}>
              <span className="flex-1">
                <span className="block font-medium text-ink">Login alerts</span>
                <span className="block text-sm text-muted">Email and push when a new device signs in</span>
              </span>
              <Switch checked={loginAlerts} disabled onChange={setLoginAlerts} label="Login alerts" />
            </li>
          </ul>
        </section>

        <section aria-labelledby="sessions-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="sessions-heading" className="text-sm font-medium text-muted">
              Where you’re signed in
            </h2>
            {sessions.length > 1 &&
            <button
              type="button"
              onClick={async()=>{setBusy(true);try{await Promise.all(sessions.filter(row=>!row.current).map(row=>securityApi.revoke(row.id)));sessionData.refresh();toast('Other sessions signed out');}catch(error){toast.error(apiErrorMessage(error));}finally{setBusy(false);}}}
              className="h-11 rounded-xl px-2 text-sm font-semibold text-danger">
              
                Sign out others
              </button>
            }
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">
            {sessions.map((s) =>
            <li key={s.id} className={row}>
                {s.device.includes('app') ? <SmartphoneIcon className="h-5 w-5 text-muted" aria-hidden="true" /> : <LaptopIcon className="h-5 w-5 text-muted" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.device}</span>
                  <span className="block text-sm text-muted">
                    {s.place} · {s.current ? 'This device' : formatWhen(s.lastSeen)}
                  </span>
                </span>
                {!s.current &&
              <button
                type="button"
                onClick={()=>void revoke(s.id)}
                className="h-11 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft">
                
                    Sign out
                  </button>
              }
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="mb-2 text-sm font-medium text-muted">
            Privacy
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">
            {(
            [
            ['shareAnonStats', 'Help improve scam detection', 'Share anonymous check patterns. Never your identity.'],
            ['showNameOnReviews', 'Show my first name on reviews', 'Otherwise reviews show as “PadiCheck user”.'],
            ['personalisedTips', 'Personalised safety tips', 'Based on the kinds of checks you run.']] as
            const).
            map(([k, label, hint]) =>
            <li key={k} className={row}>
                <span className="flex-1">
                  <span className="block font-medium text-ink">{label}</span>
                  <span className="block text-sm text-muted">{hint}</span>
                </span>
                <Switch checked={privacy[k]} disabled onChange={unavailable} label={label} />
              </li>
            )}
            <li className={row}>
              <DownloadIcon className="h-5 w-5 text-muted" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-medium text-ink">Download my data</span>
                <span className="block text-sm text-muted">Your account, saved checks, reports and invoices</span>
              </span>
              <button type="button" onClick={exportData} className="h-11 rounded-xl px-3 text-sm font-semibold text-brand-dark hover:bg-canvas">
                Export
              </button>
            </li>
          </ul>
        </section>

        <section aria-labelledby="connected-heading">
          <h2 id="connected-heading" className="mb-2 text-sm font-medium text-muted">
            Connected accounts
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">
            {(['google', 'apple'] as const).map((p) => {
              const linked = session?.provider === p;
              return (
                <li key={p} className={row}>
                  <span className="flex-1 font-medium capitalize text-ink">{p}</span>
                  <span className={`text-sm ${linked ? 'font-semibold text-brand-dark' : 'text-muted'}`}>{linked ? 'Connected' : 'Not connected'}</span>
                  <button type="button" onClick={()=>{if(p==='google'&&!linked)setSheet('google');else unavailable();}} className="h-11 rounded-xl px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas">
                    {linked ? 'Manage' : 'Connect'}
                  </button>
                </li>);

            })}
          </ul>
        </section>
      </div>

      <BottomSheet
        open={sheet === 'password'}
        onClose={() => setSheet(null)}
        title="Change password"
        footer={
        <button type="button" onClick={changePassword} disabled className={`${primaryButton} w-full`}>
            {busy && <LoaderCircleIcon className="h-5 w-5 animate-spin" aria-hidden="true" />} Update password
          </button>
        }>
        
        <div className="space-y-4">
          {(['current', 'next', 'confirm'] as const).map((k) =>
          <Field key={k} label={k === 'current' ? 'Current password' : k === 'next' ? 'New password' : 'Confirm new password'}>
              <input type="password" autoComplete={k === 'current' ? 'current-password' : 'new-password'} value={pw[k]} onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))} className={inputClass} />
            </Field>
          )}
          {pwError &&
          <p role="alert" className="text-sm text-danger">
              {pwError}
            </p>
          }
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === '2fa'}
        onClose={() => setSheet(null)}
        title={step === 'scan' ? 'Set up two-factor authentication' : 'Save your backup codes'}
        description={step === 'scan' ? 'Scan with Google Authenticator, Authy or 1Password, then enter the 6-digit code.' : 'Each code works once if you lose your phone. Store them somewhere safe.'}
        footer={
        step === 'scan' ?
        <button
          type="button"
          disabled={busy||code.length!==6} onClick={()=>void confirmSetup()}
          className={`${primaryButton} w-full`}>
          
              Verify code
            </button> :

        <button
          type="button"
          onClick={()=>setSheet(null)}
          className={`${primaryButton} w-full`}>
          
              I’ve saved them
            </button>

        }>
        
        {step === 'scan' ?
        <div className="space-y-4 text-center">
            {setup&&<div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={setup.otpauth_uri} size={168}/></div>}
            <p className="font-mono text-sm text-muted">{setup?.secret}</p>
            <OtpInput value={code} onChange={setCode} invalid={Boolean(codeError)} />
            {codeError &&
          <p role="alert" className="text-sm text-danger">
                {codeError}
              </p>
          }
          </div> :

        <ul className="grid grid-cols-2 gap-2 font-mono">
            {backupCodes.map((c) =>
          <li key={c} className="rounded-xl bg-canvas p-3 text-center text-ink">
                {c}
              </li>
          )}
          </ul>
        }
      </BottomSheet>


      <BottomSheet open={sheet==='disable2fa'||sheet==='recovery'} onClose={()=>setSheet(null)} title={sheet==='recovery'?'Regenerate recovery codes':'Turn off two-factor authentication?'} description="Enter an authenticator or recovery code. This signs out all sessions." footer={<button type="button" disabled={busy} className={primaryButton+' w-full'} onClick={async()=>{if(busy)return;setBusy(true);setCodeError('');try{finish(await(sheet==='recovery'?securityApi.regenerate(code.trim().toLowerCase()):securityApi.disable(code.trim().toLowerCase())));}catch(error){setCodeError(apiErrorMessage(error));}finally{setBusy(false);}}}>Confirm</button>}><input value={code} onChange={event=>setCode(event.target.value)} autoComplete="one-time-code" aria-label="Authenticator or recovery code" className={inputClass}/>{codeError&&<p role="alert" className="mt-3 text-sm text-danger">{codeError}</p>}</BottomSheet>
      <BottomSheet open={sheet==='google'} onClose={()=>setSheet(null)} title="Connect Google"><GoogleSignIn action="link" disabled={!session?.emailVerified} onCredential={async credential=>{await authApi.linkGoogle(credential);setSheet(null);toast.success('Google account linked');}}/></BottomSheet>
    </>);

}