const digits = (value: string) => value.replace(/\D/g, '');
import type { Business, EntityType, TrustEntity } from '../types/trust';
export type ApiErrorCode = 'network' | 'rate_limited' | 'unavailable' | 'unauthorized' | 'forbidden';
export class ApiError extends Error {
    constructor(public code: ApiErrorCode, message: string, public retryAfter?: number) { super(message); }
}
export function validateCheckInput(type: EntityType, raw: string): string | null {
    const input = raw.trim();
    if (!input)
        return 'Enter something to check';
    switch (type) {
        case 'phone': {
            const d = digits(input);
            return d.length < 10 || d.length > 14 ? 'Enter a full phone number, including the network prefix' : null;
        }
        case 'website':
        case 'listing':
            return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(input) ? null : 'Enter a valid web address, like example.com';
        case 'social':
            return /^@?[\w.]{2,30}$/.test(input) || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S+/.test(input) ? null : 'Enter an @username or a profile link';
        case 'person':
            return input.split(/\s+/).filter(Boolean).length < 2 ? 'Enter a full name, ideally with a phone number or email' : null;
        default:
            return input.length < 3 ? 'Enter at least 3 characters' : null;
    }
}
function unsupported(): never { throw new ApiError('unavailable', 'Numerical Trust Scores and synthetic verification results are unavailable. Use investigations or directory APIs.'); }
export function entityFromBusiness(_business: Business): TrustEntity { return unsupported(); }
export async function runTrustCheck(_type: EntityType, _input: string, _known: TrustEntity[]): Promise<TrustEntity | null> { return unsupported(); }
export async function refreshEntity(_entity: TrustEntity): Promise<TrustEntity> { return unsupported(); }
export async function submit<T>(_payload: T, _ms = 900): Promise<T> { return unsupported(); }
