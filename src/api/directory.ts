import { api } from './client';
export interface PublicBusiness {
    profile_status?:'draft'|'published'|'hidden';
    member_role?:'owner'|'manager'|'editor'|'viewer';
    profile_details?:{opening_hours?:string|null};
    business_profile_id: string;
    entity_id: string;
    canonical_name: string;
    business_category: string;
    profile_description: string | null;
    city: string | null;
    country_code: string | null;
}
export interface PublicBusinessDetail {
    business: PublicBusiness;
    identifiers: {
        identifier_type: string;
        value: string;
    }[];
    verification_review: {
        status: string;
        reviewed_at: string;
    } | null;
    limitations: string[];
}
export const directoryApi = { detail: (id: string, signal?: AbortSignal) => api<PublicBusinessDetail>(`/v1/directory/${encodeURIComponent(id)}`, { signal }) };
