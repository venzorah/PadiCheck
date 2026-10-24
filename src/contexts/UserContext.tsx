import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {PageSkeleton} from '../components/Skeleton';
import {ApiError} from '../api/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi, type AuthSession, type Challenge, type Registration, type LoginResponse } from '../api/auth';
import type {CreditBalance} from '../api/credits';
import { apiErrorMessage, onSessionExpired, setAccessToken } from '../api/client';
import { notificationsApi } from '../api/notifications';
import { bookmarksApi } from '../api/bookmarks';
import { api } from '../api/client';
import { clearPrivateState } from '../utils/privateState';
import { dispatchLoginResponse } from '../utils/authFlow';
import { usePersistentState } from '../hooks/usePersistentState';
import { useOfflineQueue, type OfflineQueueApi } from '../hooks/useOfflineQueue';
import type { ConsumerSession, CreditTransaction } from '../types/check';
interface Preferences {
    country: string;
    currency: string;
    language: string;
}
interface UserContextValue extends OfflineQueueApi {
    session: ConsumerSession | null;
    signIn: (email: string, password: string) => Promise<boolean>;
    signInWithGoogle: (credential: string) => Promise<boolean>;
    signOut: () => Promise<void>;
    clearSession: () => void;
    pendingMfa: {
        token: string;
        expiresAt: number;
        provider: ConsumerSession['provider'];
    } | null;
    verifyMfa: (code: string) => Promise<void>;
    cancelMfa: () => void;
    securityCodes: string[];
    securityCompleted: boolean;
    completeSecurity: (codes?: string[]) => void;
    dismissSecurityCodes: () => void;
    pendingSignup: (Registration & Challenge & {
        requestedAt: number;
    }) | null;
    startSignup: (registration: Registration) => Promise<void>;
    verifySignup: (code: string) => Promise<void>;
    resendSignup: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
    credits: number;
    transactions: CreditTransaction[];
    spendCredits: (amount: number, label: string) => boolean;
    addCredits: (amount: number, label: string) => void;
    savedIds: string[];
    isSaved: (id: string) => boolean;
    toggleSaved: (id: string) => Promise<void>;
    dataSaver: boolean;
    setDataSaver: (on: boolean) => void;
    notificationPrefs: Record<string, boolean>;
    setNotificationPref: (id: string, on: boolean) => void;
    preferences: Preferences;
    setPreference: (key: keyof Preferences, value: string) => void;
}
const UserContext = createContext<UserContextValue | null>(null);
export function UserProvider({ children }: {
    children: ReactNode;
}) {
    const location = useLocation();
    const navigate=useNavigate();
    const [restoring,setRestoring]=useState(true);
    const [restoreFailure,setRestoreFailure]=useState('');
    const [restoreAttempt,setRestoreAttempt]=useState(0);
    const sessionOperation=useRef(0);
    const restoringRef=useRef(true);
    const renewSession=useRef(()=>setRestoreAttempt(value=>value+1));
    const [session, setSession] = useState<ConsumerSession | null>(null);
    const [pendingSignup, setPendingSignup] = useState<UserContextValue['pendingSignup']>(null);
    const [pendingMfa, setPendingMfa] = useState<UserContextValue['pendingMfa']>(null);
    const [securityCodes, setSecurityCodes] = useState<string[]>([]);
    const [securityCompleted, setSecurityCompleted] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [credits, setCredits] = useState(Number.NaN);
    const [transactions,setTransactions]=useState<CreditTransaction[]>([]);
    const [dataSaver, setDataSaver] = usePersistentState('pc-data-saver', false);
    const [preferences, setPreferences] = usePersistentState<Preferences>('pc-preferences', { country: 'NG', currency: 'NGN', language: 'en' });
    const expiryTimer = useRef<number>();
    const clearSession = useCallback(() => {
        sessionOperation.current++;restoringRef.current=false;setRestoring(false);setRestoreFailure('');
        setAccessToken(null);
        setSession(null);
        setPendingSignup(null);
        setPendingMfa(null);
        setSecurityCodes([]); setSecurityCompleted(false);
        setNotificationPrefs({});
        setSavedIds([]); setCredits(Number.NaN);setTransactions([]);
        clearPrivateState();
        window.clearTimeout(expiryTimer.current);
    }, []);
    useEffect(() => { clearPrivateState(); const unsubscribe = onSessionExpired(()=>{if(!restoringRef.current){restoringRef.current=true;renewSession.current();}}); return () => { unsubscribe(); window.clearTimeout(expiryTimer.current); setAccessToken(null); }; }, [clearSession]);
    useEffect(() => { if (!['/signup', '/verify-code'].includes(location.pathname))
        setPendingSignup(null); if (location.pathname !== '/security-complete') { setSecurityCodes([]); setSecurityCompleted(false); } }, [location.pathname]);
    useEffect(() => { document.documentElement.classList.toggle('data-saver', dataSaver); }, [dataSaver]);
    useEffect(() => {
        if (!session)
            return;
        const abort = new AbortController();
        void notificationsApi.preferences(abort.signal).then(({ preferences: list }) => { if (!abort.signal.aborted)
            setNotificationPrefs(Object.fromEntries(list.map((row) => [row.notification_type, row.enabled]))); }).catch(() => undefined);
        return () => abort.abort();
    }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        setSavedIds([]); setCredits(Number.NaN);
        if (!session) return;
        const abort = new AbortController();
        void api<{bookmarks:{investigation_id:string}[]}>('/v1/me/bookmarks?limit=100&offset=0',{auth:true,signal:abort.signal}).then(result=>{if(!abort.signal.aborted)setSavedIds(result.bookmarks.map(row=>row.investigation_id));}).catch(()=>undefined);
        void api<CreditBalance>('/v1/credits/me',{auth:true,signal:abort.signal}).then(async result=>{
          if(abort.signal.aborted)return;
          if(result.enabled){setCredits(result.available_units);setTransactions(result.transactions);}
          else {const billing=await api<{enabled:boolean;available_units:number}>('/v1/billing/me',{auth:true,signal:abort.signal});if(!abort.signal.aborted){setCredits(billing.enabled?billing.available_units:Number.NaN);setTransactions([]);}}
        }).catch(()=>undefined);
        return ()=>abort.abort();
    }, [session?.id,location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
    const acceptSession = useCallback(async (result: AuthSession, provider: ConsumerSession['provider'] = 'email') => {
        const operation=sessionOperation.current;
        const expiresAt = Date.now() + result.expires_in * 1000;
        const { user } = await authApi.me(result.access_token);
        if(operation!==sessionOperation.current)throw new Error('Session changed');
        if (Date.now() >= expiresAt)
            throw new Error('Session expired');
        clearPrivateState();
        window.clearTimeout(expiryTimer.current);
        setAccessToken(result.access_token);
        setSession({ id: user.users_id, name: user.display_name, email: user.email, emailVerified: user.email_verified, roles: user.roles ?? [], permissions: user.permissions ?? [], provider });
        setPendingSignup(null);
        setPendingMfa(null);
        setSecurityCodes([]);
        expiryTimer.current = window.setTimeout(()=>renewSession.current(), Math.max(1000,expiresAt-Date.now()-60000));
    }, [clearSession]);
    useEffect(()=>{
        let cancelled=false;const operation=++sessionOperation.current;
        restoringRef.current=true;setRestoring(true);setRestoreFailure('');
        void authApi.restore().then(async result=>{
            if(cancelled||operation!==sessionOperation.current)return;
            await acceptSession(result);
        }).catch(error=>{
            if(cancelled||operation!==sessionOperation.current)return;
            if(error instanceof ApiError&&error.status===401)clearSession();
            else {setRestoreFailure(apiErrorMessage(error));window.clearTimeout(expiryTimer.current);expiryTimer.current=window.setTimeout(()=>renewSession.current(),15000);}
        }).finally(()=>{if(!cancelled){restoringRef.current=false;setRestoring(false);}});
        return()=>{cancelled=true;sessionOperation.current++;};
    },[restoreAttempt,acceptSession,clearSession]);
    const handleLogin = useCallback(async (result: LoginResponse, provider: ConsumerSession['provider']) => {
        return dispatchLoginResponse(result, {
            challenge: (challenge) => { clearSession(); setPendingMfa({ token: challenge.challenge_token, expiresAt: Date.now() + challenge.expires_in * 1000, provider }); },
            access: (access) => acceptSession(access, provider),
        });
    }, [acceptSession, clearSession]);
    const signIn = useCallback(async (email: string, password: string) => handleLogin(await authApi.login(email, password), 'email'), [handleLogin]);
    const signInWithGoogle = useCallback(async (credential: string) => handleLogin(await authApi.googleLogin(credential), 'google'), [handleLogin]);
    const verifyMfa = useCallback(async (code: string) => {
        if (!pendingMfa || Date.now() >= pendingMfa.expiresAt) {
            setPendingMfa(null);
            throw new Error('The login challenge expired. Start a fresh login.');
        }
        await acceptSession(await authApi.verifyMfa(pendingMfa.token, code), pendingMfa.provider);
    }, [pendingMfa, acceptSession]);
    const startSignup = useCallback(async (registration: Registration) => { const challenge = await authApi.register(registration); setPendingSignup({ ...registration, ...challenge, requestedAt: Date.now() }); }, []);
    const resendSignup = useCallback(async () => { if (!pendingSignup)
        throw new Error('Restart signup.'); const { display_name, email, password } = pendingSignup; const challenge = await authApi.register({ display_name, email, password }); setPendingSignup({ display_name, email, password, ...challenge, requestedAt: Date.now() }); }, [pendingSignup]);
    const verifySignup = useCallback(async (code: string) => { if (!pendingSignup)
        throw new Error('Restart signup.'); await acceptSession(await authApi.verify({ email: pendingSignup.email, challenge_id: pendingSignup.challenge_id, code })); }, [pendingSignup, acceptSession]);
    const signOut = useCallback(async () => { try {
        await authApi.logout();
    }
    catch (error) {
        toast.error(`Local sign-out only; server revocation could not be confirmed. ${apiErrorMessage(error)}`);
    }
    finally {
        try{await authApi.endBrowserSession();}catch{toast.error('Browser sign-out could not be confirmed. Reconnect and sign out again.');}
        clearSession();
        window.google?.accounts.id.disableAutoSelect();
    } }, [clearSession]);
    const queue = useOfflineQueue();
    const value = useMemo<UserContextValue>(() => ({ ...queue, session, pendingSignup, pendingMfa, securityCodes, securityCompleted, clearSession, signIn, signInWithGoogle, signOut, startSignup, verifySignup, resendSignup, verifyMfa,
        cancelMfa: () => setPendingMfa(null), completeSecurity: (codes = []) => { clearSession(); setSecurityCodes(codes); setSecurityCompleted(true); }, dismissSecurityCodes: () => { setSecurityCodes([]); setSecurityCompleted(false); },
        hasPermission: (permission) => Boolean(session?.permissions.includes(permission) || (session?.roles.includes('superadmin') && session.permissions.includes('*'))),
        credits, transactions, spendCredits: () => false, addCredits: () => { throw new Error('Client credit grants are not supported.'); }, savedIds, isSaved: id => savedIds.includes(id), toggleSaved: async id => { const saved=savedIds.includes(id); if(saved) await bookmarksApi.remove(id);else await bookmarksApi.add(id);setSavedIds(old=>saved?old.filter(value=>value!==id):[...old,id]); },
        dataSaver, setDataSaver, notificationPrefs, setNotificationPref: (id, on) => { if (!['investigation.completed', 'investigation.failed', 'business.invitation'].includes(id))
            return; void notificationsApi.setPreference(id as Parameters<typeof notificationsApi.setPreference>[0], on).then(() => setNotificationPrefs((old) => ({ ...old, [id]: on }))).catch((error) => toast.error(apiErrorMessage(error))); },
        preferences, setPreference: (key, value) => setPreferences((old) => ({ ...old, [key]: value }))
    }), [queue, session, savedIds, credits, transactions, pendingSignup, pendingMfa, securityCodes, securityCompleted, clearSession, signIn, signInWithGoogle, signOut, startSignup, verifySignup, resendSignup, verifyMfa, dataSaver, setDataSaver, notificationPrefs, preferences, setPreferences]);
    const publicPage=/^\/(welcome|about|how-it-works|pricing|for-business|contact|help|legal\/|b\/|certificate|shared|directory|developers\/docs)/.test(location.pathname);
    const content=publicPage||session?children:restoring?<PageSkeleton/>:restoreFailure?<div className="mx-auto max-w-lg space-y-4 px-4 py-12" role="alert"><p className="text-ink">We couldn’t restore your session. {restoreFailure}</p><button className="rounded-2xl bg-brand px-5 py-3 font-semibold text-white" onClick={()=>setRestoreAttempt(value=>value+1)}>Try again</button><button className="ml-3 text-brand-dark" onClick={()=>{clearSession();navigate('/signin',{replace:true,state:{from:location.pathname+location.search}});}}>Sign in again</button></div>:children;
    return <UserContext.Provider value={value}>{content}</UserContext.Provider>;
}
export function useUser() { const context = useContext(UserContext); if (!context)
    throw new Error('useUser requires UserProvider'); return context; }
