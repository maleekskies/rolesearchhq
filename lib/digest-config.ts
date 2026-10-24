// The digest is deliberately gated while Resend is still on its shared test
// sender. Until a real sending domain is configured (or the deployer explicitly
// marks one verified), only the owner's own address may receive email. This
// keeps the app from trying to mail other users from onboarding@resend.dev,
// which Resend would reject anyway.
export const DIGEST_FROM = process.env.RESEND_FROM || 'RoleSearchHQ <onboarding@resend.dev>';

function ownerEmail(): string {
  return (process.env.DIGEST_OWNER_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '')
    .trim()
    .toLowerCase();
}

export function hasVerifiedDigestDomain(): boolean {
  if (process.env.RESEND_DOMAIN_VERIFIED === 'true') return true;
  const from = process.env.RESEND_FROM?.trim();
  if (!from) return false;
  return !/@resend\.dev\b/i.test(from);
}

export function canSendDigestTo(email: string | null | undefined): boolean {
  if (!email) return false;
  if (hasVerifiedDigestDomain()) return true;
  return email.trim().toLowerCase() === ownerEmail();
}

export const DIGEST_DEFERRED_MESSAGE =
  'The daily digest is paused for this account until RoleSearchHQ has a verified sending domain. Nothing was sent.';
