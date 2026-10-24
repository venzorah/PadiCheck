import type { PublicBusiness, PublicBusinessDetail } from '../api/directory';
import type { Business, TrustEntity, UserReport, Dispute, AppNotification } from '../types/trust';
import type { AppNotice } from '../api/notifications';
import type { AnalysisResult } from '../types/check';
import type { Investigation, SpecialistCheck } from '../types/investigation';

// These adapters fill the original presentation models from server records only.
// Unavailable metrics remain absent/NaN; they never become invented scores.
export const emptyBusiness: Business = {
  id: '', slug: '', name: 'Your business', category: '', description: '', location: '', website: '', phone: '', email: '',
  socials: [], regNumber: '', owner: '', verification: 'none', tier: 'Basic Verification', score: NaN, views30d: NaN, checks30d: NaN, documents: [],
};
export function businessView(row: PublicBusiness, detail?: PublicBusinessDetail): Business {
  const identifier = (type: string) => detail?.identifiers.find(item => item.identifier_type === type)?.value || '';
  return { ...emptyBusiness, id: row.business_profile_id, slug: row.business_profile_id, entityId: row.entity_id,
    name: row.canonical_name, category: row.business_category, description: row.profile_description || '', location: [row.city, row.country_code].filter(Boolean).join(', '),
    website: identifier('url') || identifier('domain'), phone: identifier('phone'), email: identifier('email'), regNumber: identifier('registration_number'),
    verification: detail?.verification_review?.status === 'approved' ? 'verified' : 'none',
    lastVerifiedAt: detail?.verification_review?.reviewed_at,
    directory: { status: row.profile_status==='draft'?'pending':row.profile_status==='hidden'?'suspended':'active', feeNaira: NaN, submittedAt: '',hours:row.profile_details?.opening_hours||undefined },
  };
}
export function businessEntity(business: Business): TrustEntity {
  return { id: business.entityId || business.id, type: 'business', name: business.name, identifier: business.regNumber,
    subtitle: [business.category, business.location].filter(Boolean).join(' · '), score: NaN, confidence: 'Low', verification: 'unverified',
    lastChecked: business.lastVerifiedAt || '', facts: [], signals: [], factors: [], unresolvedReports: 0, totalReports: 0,
    recommendation: 'Read the available evidence. Numerical scoring is unavailable.', businessSlug: business.slug };
}
export function investigationView(row: Investigation): AnalysisResult {
  const failures: Record<string, string> = {
    analysis_failed: 'An evidence-backed answer could not be produced. Retry this check or add a website or more identifying details.',
    invalid_model_output: 'The analysis could not be validated against its sources. Retry this check or add a website or more identifying details.',
    no_readable_evidence: 'No readable source evidence was found. Add a website, document, or more identifying details and try again.',
    provider_timeout: 'The analysis service took too long to respond. Retry this check shortly.',
    provider_unavailable: 'The analysis service is temporarily unavailable. Retry this check shortly.',
    provider_rate_limited: 'The analysis service is busy. Wait a little, then retry this check.',
    provider_connection_failed: 'The analysis service could not be reached. Retry this check shortly.',
  };
  const statusSummary: Record<Investigation['status'], string> = {
    queued: 'Your check is queued. It will update when source collection starts.',
    collecting_sources: 'We are finding and retrieving sources for this check.',
    analyzing: 'We are analysing the available evidence.',
    completed: 'Open this check to view the collected evidence.',
    cancelled: 'This check was cancelled.',
    failed: failures[row.error_code || ''] || 'This check could not be completed. Open it to retry or start a new check with more details.',
  };
  return { id: row.investigation_id, type: row.investigation_type === 'contract_review' ? 'contract' : row.investigation_type === 'web_analysis' ? 'link' : 'shopping',
    categoryLabel: row.investigation_type.replace(/_/g, ' '), title: row.title || 'Investigation', source: row.status.replace(/_/g, ' '), createdAt: row.created_at,
    verdict: 'caution', status: row.status.replace(/_/g, ' '), summary: row.result_summary || statusSummary[row.status], sections: [], looksGood: [], toCheck: [], creditsUsed: NaN, availableOffline: false };
}
export function specialistView(check: SpecialistCheck): AnalysisResult['sections'][number] {
  const labels = { phone: 'Phone intelligence', business: 'Business registration', property: 'Property location', job: 'Employer confirmation' };
  const statuses: Record<string, string> = { not_configured: 'Service not configured', needs_input: 'More information or confirmation needed', unavailable: 'Check unavailable',
    record_found: 'Registry record returned', record_matched: 'Registration details matched', record_mismatch: 'Registration details differ', not_found: 'No result returned',
    valid_number: 'Provider reports a valid number', invalid_number: 'Provider reports an invalid number', possible_matches: 'Possible matches need confirmation', location_found: 'Location found; title remains unverified' };
  return { label: labels[check.kind], verdict: 'caution', headline: statuses[check.status] || 'Check result',
    detail: [check.summary, ...(check.facts || []).map(fact => `${fact.label}: ${fact.value}`),
      `${check.provider}${check.checked_at ? ' · ' + check.checked_at.slice(0, 10) : ''}`].join(' ') };
}
export function reportView(row: Record<string, unknown>): UserReport {
  const status = ({ submitted: 'pending', under_review: 'review', published: 'resolved', dismissed: 'rejected', rejected: 'rejected', withdrawn: 'withdrawn' } as const)[String(row.status)] || 'pending';
  return { id: String(row.user_report_id), entityId: String(row.entity_id || ''), entityName: String(row.title || ''), entityType: 'business', category: String(row.report_category || ''),
    description: String(row.description || ''), evidence: [], reporter: String(row.submitted_by_user_id || ''), status, risk: 'medium', at: String(row.submitted_at || row.created_at || ''), updates: [] };
}
export function disputeView(row: Record<string, unknown>): Dispute {
  return { id: String(row.dispute_id), reportId: String(row.user_report_id || ''), businessId: String(row.business_profile_id || ''), businessName: String(row.business_name || row.title || 'Dispute'),
    request: 'review', statement: String(row.reason || row.statement || ''), evidence: [], status: row.status === 'resolved' ? 'resolved' : row.status === 'rejected' ? 'rejected' : row.status === 'withdrawn' ? 'withdrawn' : row.status === 'under_review' ? 'review' : 'open',
    decision: row.decision_note ? String(row.decision_note) : undefined, at: String(row.created_at || row.filed_at || ''), messages: [] };
}
export function notificationView(row: AppNotice): AppNotification {
  const invitation = row.notification_type === 'business.invitation';
  return { id: row.notification_id, category: invitation ? 'verification' : 'check', title: invitation ? 'Business invitation' : row.notification_type === 'investigation.completed' ? 'Your check is ready' : 'Your check needs attention',
    body: invitation ? 'Open your business invitations to respond.' : 'Open the investigation for details.', at: row.created_at, read: Boolean(row.read_at),
    to: invitation ? '/business' : `/result/${row.related_id}` };
}
