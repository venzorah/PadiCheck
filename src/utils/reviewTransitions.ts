const transitions: Record<string, Record<string, string[]>> = {
  verifications: { pending: ['in_review', 'approved', 'rejected'], in_review: ['approved', 'rejected'] },
  reports: { submitted: ['under_review', 'published', 'rejected'], under_review: ['published', 'rejected'], published: ['under_review', 'rejected'] },
  disputes: { submitted: ['under_review', 'resolved', 'rejected'], under_review: ['resolved', 'rejected'] },
};
export function reviewTransitions(kind: string, status: string): string[] {
  return transitions[kind]?.[status] ?? [];
}
