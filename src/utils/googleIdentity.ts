import { ApiError, apiErrorMessage } from '../api/client';

export interface GoogleIdentity {
  initialize: (options: {
    client_id: string; nonce: string; auto_select: boolean; ux_mode: 'popup';
    callback: (response: { credential?: string }) => void;
  }) => void;
  renderButton: (element: HTMLElement, options: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; width: number }) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window { google?: { accounts: { id: GoogleIdentity } }; }
}

let loading: Promise<GoogleIdentity> | undefined;
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      loading = undefined;
      reject(new Error('Google could not load. Check your connection and try again.'));
    };
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      const sdk = window.google?.accounts.id;
      if (sdk) resolve(sdk); else fail();
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function googleErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'account_link_required') return 'This email already has a password account. Sign in with your password, then link Google in Security & privacy.';
    if (error.code === 'email_verification_required') return 'Create an account and verify your email before signing in with Google.';
    if (error.code === 'google_auth_unavailable') return 'Google sign-in is currently unavailable. Please use email and password.';
    if (error.code === 'invalid_google_challenge') return 'Google sign-in expired or was already used. Please try again to start a fresh sign-in.';
    if (error.code === 'verified_email_required') return 'Link the Google account with the same email as your verified PadiCheck account.';
    if (error.code === 'google_identity_linked') return 'This Google account is already linked to another PadiCheck account.';
    return apiErrorMessage(error);
  }
  return error instanceof Error ? error.message : 'Google sign-in could not complete. Please try again.';
}
