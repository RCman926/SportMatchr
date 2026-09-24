/**
 * Founder ops (seed UI, backend chrome).
 * Prefer EXPO_PUBLIC_FOUNDER_EMAILS=you@email.com,other@email.com
 * Also unlocked when this browser entered via ?founder=1 (sticky flag).
 */
export function founderEmails(): string[] {
  const raw = process.env.EXPO_PUBLIC_FOUNDER_EMAILS ?? '';
  return raw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderOpsEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = founderEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

export function canAccessFounderOps(opts: {
  email?: string | null;
  isFounderPreview?: boolean;
}): boolean {
  return Boolean(opts.isFounderPreview) || isFounderOpsEmail(opts.email);
}
