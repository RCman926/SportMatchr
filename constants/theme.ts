/**
 * SportMatchr — “evening court” palette.
 * Asphalt ink + lime court line. Avoids generic teal-SaaS / purple AI looks.
 */
export const theme = {
  bg: '#F2F4F1',
  surface: '#FFFFFF',
  ink: '#1A211C',
  muted: '#5C6B62',
  border: '#D5DDD6',

  /** Court-line green */
  accent: '#2F6B3A',
  accentBright: '#3F8F4A',
  accentDark: '#1F4D28',
  accentSoft: '#E4F0E6',

  panel: '#F2F4F1',
  panelMuted: '#3F8F4A',
  panelBright: '#FFFFFF',

  wine: '#2F6B3A',
  wineSoft: '#E4F0E6',

  freeBg: '#E4F0E6',
  freeFg: '#1F4D28',
  paidBg: '#E8EEF5',
  paidFg: '#2C4A6E',

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
