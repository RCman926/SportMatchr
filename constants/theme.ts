/**
 * SportMatchr — Court Fresh palette.
 * Light, athletic, trustworthy. Teal energy on cool gray — not black/gold luxury.
 */
export const theme = {
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',

  /** Primary teal */
  accent: '#0D9488',
  /** Bright teal highlight */
  accentBright: '#14B8A6',
  accentDark: '#0F766E',
  accentSoft: '#CCFBF1',

  panel: '#F4F6F8',
  panelMuted: '#14B8A6',
  panelBright: '#FFFFFF',

  wine: '#0D9488',
  wineSoft: '#CCFBF1',

  freeBg: '#CCFBF1',
  freeFg: '#0F766E',
  paidBg: '#E0F2FE',
  paidFg: '#0369A1',

  danger: '#EF4444',
  warnBg: '#FEF3C7',
  warnFg: '#B45309',

  success: '#16A34A',
  successSoft: '#DCFCE7',
} as const;

export type Theme = typeof theme;
