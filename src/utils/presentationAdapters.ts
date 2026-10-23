import type { PublicBusiness, PublicBusinessDetail } from '../api/directory';
import type { Business, TrustEntity, UserReport, Dispute, AppNotification } from '../types/trust';
import type { AppNotice } from '../api/notifications';
import type { AnalysisResult } from '../types/check';
import type { Investigation } from '../types/investigation';

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
    directory: { status: 'active', feeNaira: NaN, submittedAt: '' },
  };
}
export function businessEntity(business: Business): TrustEntity {
  return { id: business.entityId || business.id, type: 'business', name: business.name, identifier: business.regNumber,
    subtitle: [business.category, business.location].filter(Boolean).join(' · '), score: NaN, confidence: 'Low', verification: 'unverified',
    lastChecked: business.lastVerifiedAt || '', facts: [], signals: [], factors: [], unresolvedReports: 0, totalReports: 0,
    recommendation: 'Read the available evidence. Numerical scoring is unavailable.', businessSlug: business.slug };
}
export function investigationView(row: Investigation): AnalysisResult {
  return { id: row.investigation_id, type: row.investigation_type === 'contract_review' ? 'contract' : row.investigation_type === 'web_analysis' ? 'link' : 'shopping',
    categoryLabel: row.investigation_type.replace(/_/g, ' '), title: row.title || 'Investigation', source: row.status.replace(/_/g, ' '), createdAt: row.created_at,
    verdict: 'caution', status: row.status.replace(/_/g, ' '), summary: row.result_summary || 'Open this check to view its current status and available evidence.', sections: [], looksGood: [], toCheck: [], creditsUsed: NaN, availableOffline: false };
}
export function reportView(row: Record<string, unknown>): UserReport {
  const status = ({ submitted: 'pending', under_review: 'review', published: 'resolved', dismissed: 'rejected', withdrawn: 'rejected' } as const)[String(row.status)] || 'pending';
  return { id: String(row.user_report_id), entityId: String(row.entity_id || ''), entityName: String(row.title || ''), entityType: 'business', category: String(row.report_category || ''),
    description: String(row.description || ''), evidence: [], reporter: String(row.submitted_by_user_id || ''), status, risk: 'medium', at: String(row.submitted_at || row.created_at || ''), updates: [] };
}
export function disputeView(row: Record<string, unknown>): Dispute {
  return { id: String(row.dispute_id), reportId: String(row.user_report_id || ''), businessId: String(row.business_profile_id || ''), businessName: String(row.title || 'Dispute'),
    request: 'review', statement: String(row.reason || row.statement || ''), evidence: [], status: row.status === 'resolved' ? 'upheld' : row.status === 'under_review' ? 'review' : 'open',
    at: String(row.created_at || row.filed_at || ''), messages: [] };
}
export function notificationView(row: AppNotice): AppNotification {
  const invitation = row.notification_type === 'business.invitation';
  return { id: row.notification_id, category: invitation ? 'verification' : 'check', title: invitation ? 'Business invitation' : row.notification_type === 'investigation.completed' ? 'Your check is ready' : 'Your check needs attention',
    body: invitation ? 'Open your business invitations to respond.' : 'Open the investigation for details.', at: row.created_at, read: Boolean(row.read_at),
    to: invitation ? '/business' : `/result/${row.related_id}` };
}
