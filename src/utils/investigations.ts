import type { CheckType } from '../types/check';
import type { InvestigationInput, InvestigationStatus, InvestigationType, VerificationInput } from '../types/investigation';
export type ResearchContext = CheckType | 'business' | 'phone' | 'website' | 'person' | 'social' | 'listing';

export const investigationLabels: Record<InvestigationType, string> = {
  company_research: 'Business research', web_analysis: 'Website analysis', job_search: 'Job search',
  contract_review: 'Contract review', phone_lookup: 'Phone research', general_research: 'General research',
};
export const statusLabels: Record<InvestigationStatus, string> = {
  queued: 'Queued', collecting_sources: 'Collecting sources', analyzing: 'Analyzing',
  completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
};
export const isActiveInvestigation = (status: InvestigationStatus) => ['queued', 'collecting_sources', 'analyzing'].includes(status);

export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// These are research contexts, not promises of specialized verification services.
export function buildInvestigation(input: { type: ResearchContext; mode: 'link' | 'text' | 'upload'; text: string; url: string; mediaIds: string[]; verification?: VerificationInput }): InvestigationInput {
  const investigation_type: InvestigationType = input.type === 'contract' ? 'contract_review' : input.type === 'phone' ? 'phone_lookup' : input.type === 'business' ? 'company_research' : input.type === 'job' ? 'job_search' : input.mode === 'link' ? 'web_analysis' : 'general_research';
  const verification: VerificationInput = Object.fromEntries(Object.entries(input.verification || {}).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => value));
  if (verification.official_website) {
    if (/^[a-z][a-z\d+.-]*:/i.test(verification.official_website) && !/^https?:\/\//i.test(verification.official_website)) throw new Error('Use an HTTP or HTTPS official website.');
    const website = safeHttpUrl(/^https?:\/\//i.test(verification.official_website) ? verification.official_website : `https://${verification.official_website}`);
    if (!website) throw new Error('Enter a valid official website without embedded credentials.');
    verification.official_website = website;
  }
  const urls: string[] = [];
  if (input.mode === 'link') {
    if (/^[a-z][a-z\d+.-]*:/i.test(input.url.trim()) && !/^https?:\/\//i.test(input.url.trim())) throw new Error('Use an HTTP or HTTPS link.');
    const url = safeHttpUrl(/^https?:\/\//i.test(input.url.trim()) ? input.url.trim() : `https://${input.url.trim()}`);
    if (!url || url.length > 2048) throw new Error('Enter a valid HTTP or HTTPS link without embedded credentials (up to 2,048 characters).');
    urls.push(url);
  }
  if (input.type === 'contract' && !input.mediaIds.length) throw new Error('Contract review requires at least one uploaded PDF document.');
  if (input.mode === 'upload' && !input.mediaIds.length) throw new Error('Choose at least one PDF document.');
  if (input.mediaIds.length > 10) throw new Error('Choose at most ten documents.');
  const context = input.type === 'any' ? 'the submitted information' : `the submitted ${input.type} opportunity`;
  const user_prompt = input.mode === 'text' ? input.text.trim() : input.text.trim() || `Research ${context} using the submitted references. Explain available evidence, uncertainty and limitations.`;
  if (!user_prompt || user_prompt.length > 10000) throw new Error('Describe what to research using between 1 and 10,000 characters.');
  const targets: NonNullable<InvestigationInput['input_data']>['targets'] = [];
  if (input.type === 'phone') {
    const phone = input.text.trim().replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter one phone number in international format, such as +2348012345678.');
    targets.push({ entity_type: 'other', canonical_name: phone, target_role: 'primary', identifiers: [{ identifier_type: 'phone', value: phone }] });
  }
  if (input.type === 'business' && verification.business_name) targets.push({ entity_type: 'business', canonical_name: verification.business_name, target_role: 'primary', identifiers: verification.registration_number ? [{ identifier_type: 'registration_number', value: verification.registration_number }] : [] });
  if (input.type === 'property' && verification.address) targets.push({ entity_type: 'property_listing', canonical_name: verification.address.slice(0, 200), target_role: 'primary', identifiers: [{ identifier_type: 'address', value: verification.address }] });
  if (input.type === 'job' && verification.employer_name) targets.push({ entity_type: 'business', canonical_name: verification.employer_name, target_role: 'primary', identifiers: verification.official_website ? [{ identifier_type: 'domain', value: new URL(verification.official_website).hostname }] : [] });
  const check_context = ['business', 'phone', 'property', 'job'].includes(input.type) ? input.type as 'business' | 'phone' | 'property' | 'job' : undefined;
  return { investigation_type, title: `${investigationLabels[investigation_type]}: ${input.mode === 'text' ? input.text.trim() : input.mode === 'link' ? urls[0] : 'Submitted documents'}`.slice(0, 200), user_prompt, input_data: { urls, media_ids: input.mediaIds, ...(targets.length ? { targets } : {}), ...(check_context ? { check_context } : {}), ...(Object.keys(verification).length ? { verification } : {}) } };
}
