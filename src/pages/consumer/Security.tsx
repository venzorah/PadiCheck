import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/consumer/PageHeader';
import { useUser } from '../../contexts/UserContext';
import { GoogleSignIn } from '../../components/auth/GoogleSignIn';
import { authApi } from '../../api/auth';

export function Security() {
  const { session } = useUser();
  return (
    <>
      <PageHeader title="Security & privacy" back="/account" />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 lg:px-10">
        <section className="rounded-3xl bg-surface p-5">
          <h2 className="font-semibold text-ink">Your current session</h2>
          <p className="mt-2 text-sm text-muted">Signed in as {session?.email}. {session?.emailVerified ? 'Email verified.' : 'Email not verified.'}</p>
          <p className="mt-2 text-sm text-muted">Your session expires automatically. Reloading the app requires signing in again. Use Log out on your account page to revoke this session.</p>
        </section>
        <section className="rounded-3xl bg-surface p-5">
          <h2 className="font-semibold text-ink">Link your Google account</h2>
          <p className="mb-4 mt-2 text-sm text-muted">Link Google to sign in to this account with Google next time. Choose the Google account with the same verified email as your PadiCheck account.</p>
          {!session?.emailVerified && <p className="mb-3 text-sm text-muted">Verify your PadiCheck email before linking Google.</p>}
          <GoogleSignIn key={session?.id} action="link" disabled={!session?.emailVerified} onCredential={async (credential) => {
            const result = await authApi.linkGoogle(credential);
            if (!result.linked) throw new Error('Google linking was not confirmed. Please try again.');
          }} />
        </section>
        <section className="rounded-3xl bg-surface p-5">
          <h2 className="font-semibold text-ink">Account security options</h2>
          <p className="mt-2 text-sm text-muted">Password changes, password reset, two-factor authentication, device management and account data export are not available yet.</p>
          <Link to="/contact" className="mt-4 inline-block font-semibold text-brand-dark">Contact support</Link>
        </section>
      </div>
    </>
  );
}
