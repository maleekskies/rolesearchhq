// Normalized company+title fingerprint. Two listings with the same
// fingerprint are treated as the SAME job: the same posting on two boards,
// a repost under a new id, or "Content Writer (Remote)" vs "Content Writer".
// Once a fingerprint has been seen for a user, in any status (new, ignored,
// rejected, applied...), the scan never inserts it again.

const NOISE_WORDS = new Set([
  'remote', 'hybrid', 'onsite', 'worldwide', 'anywhere', 'fulltime', 'parttime', 'contract',
  'mfd', 'mwd', 'fmd', 'wmd',
]);
const COMPANY_SUFFIX = /\b(inc|llc|ltd|limited|gmbh|ag|corp|corporation|co|company|plc|sa|bv|srl|pte)\b/g;

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ') // (Remote), [m/f/d], {EU}
    .replace(/\b(m\/f\/d|m\/w\/d|f\/m\/d|w\/m\/d|m\/f|f\/m|all genders)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join(' ');
}

function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(COMPANY_SUFFIX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeFingerprint(title: string, company: string): string {
  return `${normalizeCompany(company)}::${normalizeTitle(title)}`;
}

// The formula jobs stored before this change were fingerprinted with. Checked
// alongside the new one so older rows still count as "seen before".
export function makeLegacyFingerprint(title: string, company: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return `${normalize(company)}::${normalize(title)}`;
}
