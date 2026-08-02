/**
 * SportMatchr — evening court + ball orange.
 * Asphalt ink, court-line green, basketball orange for energy.
 * Avoids generic teal-SaaS / purple AI looks.
 */
export const theme = {
  bg: '#F3F1EC',
  surface: '#FFFFFF',
  ink: '#1A211C',
  muted: '#5C6B62',
  border: '#D8D4CC',

  /** Court-line green — structure, trust, places */
  accent: '#2F6B3A',
  accentBright: '#3F8F4A',
  accentDark: '#1F4D28',
  accentSoft: '#E4F0E6',

  /** Basketball orange — CTAs, “live”, energy */
  ball: '#E87722',
  ballBright: '#F08A3A',
  ballDark: '#B85A14',
  ballSoft: '#FDF0E4',

  panel: '#F3F1EC',
  panelMuted: '#3F8F4A',
  panelBright: '#FFFFFF',

  wine: '#2F6B3A',
  wineSoft: '#E4F0E6',

  freeBg: '#E4F0E6',
  freeFg: '#1F4D28',
  paidBg: '#FDF0E4',
  paidFg: '#B85A14',

  danger: '#C23B3B',
  warnBg: '#F7EFD8',
  warnFg: '#7A5A1E',

  success: '#2F6B3A',
  successSoft: '#E4F0E6',

  fonts: {
    display: 'Oswald_600SemiBold',
    displayBold: 'Oswald_700Bold',
    body: 'SourceSans3_400Regular',
    bodyMed: 'SourceSans3_600SemiBold',
    bodyBold: 'SourceSans3_700Bold',
  },
} as const;

export type Theme = typeof theme;
