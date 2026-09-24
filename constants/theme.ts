/**
 * SportMatchr — evening court, daylight wash.
 * Court-line green is the brand. Clay (not blaze orange) is the play button.
 */
import { Platform, type ViewStyle } from 'react-native';

export const theme = {
  /** Open lawn / morning concrete */
  bg: '#F3F6F1',
  bgDeep: '#E7EFE4',
  surface: '#FFFEFB',
  surfaceRaised: '#FFFFFF',
  ink: '#142018',
  muted: '#4E5C54',
  mutedSoft: '#6E7A72',
  border: '#D5DDD0',
  borderStrong: '#C2CEC0',

  /** Court-line green — structure, places, trust */
  accent: '#1A5C34',
  accentBright: '#2A8648',
  accentDark: '#0F3D22',
  accentSoft: '#D6E6D9',
  accentLine: 'rgba(26, 92, 52, 0.14)',

  /** Clay / brick dust — CTAs, live. Warm without yelling at the green. */
  ball: '#C75A28',
  ballBright: '#D46B38',
  ballDark: '#8E3F1A',
  ballSoft: '#F6E4D6',

  panel: '#E4E7E2',
  panelMuted: '#2A8648',
  panelBright: '#FFFFFF',

  wine: '#1A5C34',
  wineSoft: '#D6E6D9',

  freeBg: '#D6E6D9',
  freeFg: '#0F3D22',
  paidBg: '#F6E4D6',
  paidFg: '#8E3F1A',

  danger: '#C23B3B',
  warnBg: '#F7EFD8',
  warnFg: '#7A5A1E',

  success: '#1A5C34',
  successSoft: '#D6E6D9',

  space: {
    sm: 8,
    md: 12,
    lg: 16,
  },

  radius: {
    sm: 8,
    md: 14,
    lg: 18,
  },

  fonts: {
    display: 'Oswald_600SemiBold',
    displayBold: 'Oswald_700Bold',
    body: 'SourceSans3_400Regular',
    bodyMed: 'SourceSans3_600SemiBold',
    bodyBold: 'SourceSans3_700Bold',
  },
} as const;

export type Theme = typeof theme;

/** Soft evening-court lift — keep cards off the lawn without looking like a dashboard. */
export const cardShadow: ViewStyle =
  Platform.OS === 'web'
    ? ({
        boxShadow: '0 10px 28px rgba(20, 32, 24, 0.10), 0 1px 0 rgba(255,255,255,0.65) inset',
      } as ViewStyle)
    : Platform.OS === 'ios'
      ? {
          shadowColor: '#142018',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        }
      : { elevation: 3 };

export const softShadow: ViewStyle =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 4px 14px rgba(20, 32, 24, 0.07)' } as ViewStyle)
    : Platform.OS === 'ios'
      ? {
          shadowColor: '#142018',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }
      : { elevation: 2 };
