import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type AuthSession, type Challenge, type Registration } from '../api/auth';
import { apiErrorMessage, onSessionExpired, setAccessToken } from '../api/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePwa } from './PwaContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { useOfflineQueue, type OfflineQueueApi } from '../hooks/useOfflineQueue';
import { initialTransactions } from '../data/credits';
import { notificationTypes } from '../data/preferences';
import { makeId } from '../utils/checks';
import type { ConsumerSession, CreditTransaction, QueuedTask } from '../types/check';

interface Preferences {
  country: string;
  currency: string;
  language: string;
}

interface UserContextValue extends OfflineQueueApi {
  session: ConsumerSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  pendingSignup: (Registration & Challenge & { requestedAt: number }) | null;
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
  toggleSaved: (id: string) => void;
  dataSaver: boolean;
  setDataSaver: (on: boolean) => void;
  notificationPrefs: Record<string, boolean>;
  setNotificationPref: (id: string, on: boolean) => void;
  preferences: Preferences;
  setPreference: (key: keyof Preferences, value: string) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: {children: ReactNode;}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { online } = usePwa();
  const [session, setSession] = useState<ConsumerSession | null>(null);
  const [pendingSignup, setPendingSignup] = useState<(Registration & Challenge & { requestedAt: number }) | null>(null);
  const expiryTimer = useRef<number>();
  const clearSession = useCallback(() => {
    setAccessToken(null);
    setSession(null);
    setPendingSignup(null);
    window.clearTimeout(expiryTimer.current);
  }, []);
  useEffect(() => {
    try { localStorage.removeItem('pc-session'); } catch { /* Storage can be blocked. */ }
    const unsubscribe = onSessionExpired(clearSession);
    return () => { unsubscribe(); window.clearTimeout(expiryTimer.current); setAccessToken(null); };
  }, [clearSession]);
  useEffect(() => {
    if (location.pathname !== '/signup' && location.pathname !== '/verify-code') setPendingSignup(null);
  }, [location.pathname]);
  const acceptSession = useCallback(async (result: AuthSession) => {
    const expiresAt = Date.now() + result.expires_in * 1000;
    const { user } = await authApi.me(result.access_token);
    if (Date.now() >= expiresAt) throw new Error('Session expired');
    window.clearTimeout(expiryTimer.current);
    setAccessToken(result.access_token);
    setSession({ id: user.users_id, name: user.display_name, email: user.email, emailVerified: user.email_verified, roles: user.roles ?? [], permissions: user.permissions ?? [], provider: 'email' });
    setPendingSignup(null);
    expiryTimer.current = window.setTimeout(clearSession, expiresAt - Date.now());
  }, [clearSession]);
  const signIn = useCallback(async (email: string, password: string) => {
    await acceptSession(await authApi.login(email, password));
  }, [acceptSession]);
  const startSignup = useCallback(async (registration: Registration) => {
    const challenge = await authApi.register(registration);
    setPendingSignup({ ...registration, ...challenge, requestedAt: Date.now() });
  }, []);
  const resendSignup = useCallback(async () => {
    if (!pendingSignup) throw new Error('Please restart signup.');
    const { display_name, email, password } = pendingSignup;
    const challenge = await authApi.register({ display_name, email, password });
    setPendingSignup({ display_name, email, password, ...challenge, requestedAt: Date.now() });
  }, [pendingSignup]);
  const verifySignup = useCallback(async (code: string) => {
    if (!pendingSignup) throw new Error('Please restart signup.');
    await acceptSession(await authApi.verify({ email: pendingSignup.email, challenge_id: pendingSignup.challenge_id, code }));
  }, [pendingSignup, acceptSession]);
  const signOut = useCallback(async () => {
    try { await authApi.logout(); }
    catch (error) { toast.error(`Signed out on this device. Server revocation could not be confirmed. ${apiErrorMessage(error)}`); }
    finally { clearSession(); }
  }, [clearSession]);
  const [credits, setCredits] = usePersistentState('pc-credits', 18);
  const [transactions, setTransactions] = usePersistentState<CreditTransaction[]>('pc-transactions', initialTransactions);
  const [savedIds, setSavedIds] = usePersistentState<string[]>('pc-saved', ['r-iphone', 'r-lekki', 'r-tenancy']);
  const [dataSaver, setDataSaver] = usePersistentState('pc-data-saver', false);
  const [notificationPrefs, setNotificationPrefs] = usePersistentState<Record<string, boolean>>(
    'pc-notification-prefs',
    Object.fromEntries(notificationTypes.map((n) => [n.id, n.id !== 'research']))
  );
  const [preferences, setPreferences] = usePersistentState<Preferences>('pc-preferences', {
    country: 'NG',
    currency: 'NGN',
    language: 'en'
  });

  const creditsRef = useRef(credits);
  useEffect(() => {
    creditsRef.current = credits;
  }, [credits]);

  useEffect(() => {
    document.documentElement.classList.toggle('data-saver', dataSaver);
  }, [dataSaver]);

  const spendCredits = useCallback(
    (amount: number, label: string) => {
      if (creditsRef.current < amount) return false;
      creditsRef.current -= amount;
      setCredits(creditsRef.current);
      setTransactions((t) => [{ id: makeId('tx'), label, amount: -amount, at: new Date().toISOString() }, ...t]);
      return true;
    },
    [setCredits, setTransactions]
  );

  const addCredits = useCallback(
    (amount: number, label: string) => {
      creditsRef.current += amount;
      setCredits(creditsRef.current);
      setTransactions((t) => [{ id: makeId('tx'), label, amount, at: new Date().toISOString() }, ...t]);
    },
    [setCredits, setTransactions]
  );

  const queueApi = useOfflineQueue({
    online,
    charge: (task: QueuedTask) => spendCredits(task.credits, task.label),
    onReady: (task: QueuedTask) =>
    toast.success('Your queued check is ready', {
      description: task.label,
      action: { label: 'View', onClick: () => navigate(`/result/${task.resultId}`) }
    })
  });

  const value = useMemo<UserContextValue>(
    () => ({
      ...queueApi,
      session,
      signIn,
      signOut,
      pendingSignup,
      startSignup,
      verifySignup,
      resendSignup,
      hasPermission: (permission) => session?.permissions.includes(permission) ?? false,
      credits,
      transactions,
      spendCredits,
      addCredits,
      savedIds,
      isSaved: (id) => savedIds.includes(id),
      toggleSaved: (id) => setSavedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [id, ...s]),
      dataSaver,
      setDataSaver,
      notificationPrefs,
      setNotificationPref: (id, on) => setNotificationPrefs((p) => ({ ...p, [id]: on })),
      preferences,
      setPreference: (key, v) => setPreferences((p) => ({ ...p, [key]: v }))
    }),
    [queueApi, session, signIn, signOut, pendingSignup, startSignup, verifySignup, resendSignup, credits, transactions, spendCredits, addCredits, savedIds, setSavedIds, dataSaver, setDataSaver, notificationPrefs, setNotificationPrefs, preferences, setPreferences]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
