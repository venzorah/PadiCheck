import { Link } from 'react-router-dom';
import { AuthShell } from '../../components/auth/AuthShell';

export function ForgotPassword() {
  return (
    <AuthShell title="Having trouble signing in?" subtitle="Password reset and account recovery are not available yet.">
      <p className="text-sm text-muted">You can sign in with your verified email and password, or contact support for help with your account.</p>
      <Link to="/signin" className="mt-6 block font-semibold text-brand-dark">Back to sign in</Link>
      <Link to="/contact" className="mt-4 block font-semibold text-brand-dark">Contact support</Link>
    </AuthShell>
  );
}
