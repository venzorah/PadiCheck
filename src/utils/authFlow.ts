import type { AuthSession, LoginResponse, MfaChallenge } from '../api/auth';
// A factor challenge is never a bearer session. Both first-factor methods use this branch.
export async function dispatchLoginResponse(result: LoginResponse, handlers: {
    challenge: (challenge: MfaChallenge) => void;
    access: (session: AuthSession) => Promise<void>;
}): Promise<boolean> {
    if ('mfa_required' in result && result.mfa_required === true) {
        if (!result.challenge_token || result.expires_in <= 0)
            throw new Error('Invalid MFA challenge response.');
        handlers.challenge(result);
        return false;
    }
    if (!('access_token' in result) || !result.access_token)
        throw new Error('Invalid login response.');
    await handlers.access(result);
    return true;
}
export function loginDestination(complete: boolean, requested?: string): string {
    if (!complete)
        return '/mfa';
    return requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/';
}
