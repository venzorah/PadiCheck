export type InvestigationType = 'company_research' | 'web_analysis' | 'job_search' | 'contract_review' | 'phone_lookup' | 'general_research';
export type InvestigationStatus = 'queued' | 'collecting_sources' | 'analyzing' | 'completed' | 'failed' | 'cancelled';
export interface InvestigationInput {
  expected_credit_cost?: number;
  investigation_type: InvestigationType;
  title?: string;
  user_prompt: string;
  input_data?: { urls?: string[]; media_ids?: string[]; check_context?: 'business' | 'phone' | 'property' | 'job'; verification?: VerificationInput; targets?: { entity_type: 'business' | 'person' | 'website' | 'job_listing' | 'property_listing' | 'service_provider' | 'other'; canonical_name: string; target_role?: 'primary' | 'candidate' | 'comparison'; identifiers?: { identifier_type: 'phone' | 'email' | 'url' | 'domain' | 'social_profile' | 'registration_number' | 'address' | 'other'; value: string }[] }[] };
}
export interface VerificationInput { business_name?: string; registration_number?: string; country_code?: string; jurisdiction_code?: string; address?: string; employer_name?: string; official_website?: string; }
export interface SpecialistCheck { kind: 'phone' | 'business' | 'property' | 'job'; provider: string; status: string; checked_at: string | null; summary: string; facts: { label: string; value: string }[]; source_url: string; }
export interface Investigation {
  investigation_id: string; user_id: string; investigation_type: InvestigationType;
  title: string | null; status: InvestigationStatus; error_code: string | null;
  created_at: string; updated_at: string; started_at: string | null; completed_at: string | null;
  result_summary?: string | null; user_prompt?: string; input_data?: InvestigationInput['input_data'];
}
export interface Capabilities { independent_search: boolean; ai_analysis: boolean; }
export interface InvestigationDetail {
  investigation: Investigation; targets: unknown[]; source_collection_complete: boolean;
  capabilities: Capabilities; limitations: string[];
  specialist_checks?: SpecialistCheck[];
}
export interface InvestigationCreated { investigation: Investigation; dispatch: 'queued' | 'deferred'; capabilities?: Capabilities; }
export interface InvestigationSource {
  source_id: string; source_type?: string; url: string | null; media_id: string | null;
  title: string | null; publisher?: string | null; excerpt?: string | null;
  fetched_at?: string | null; support_type?: string; evidence_note?: string | null;
}
export interface InvestigationFinding {
  finding_id: string; finding_type: string; category: string; title: string; explanation: string;
  confidence: string | number | null; verification_status: string; sources: InvestigationSource[];
}
export interface MediaRecord {
  media_id: string; original_filename: string; mime_type: string; media_type: string;
  upload_status: string; visibility: string; size_bytes: string | number;
}
