import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import {
  VerificationLevel,
  VERIFICATION_LABEL,
} from '../constants/mockData';

const COLORS: Record<VerificationLevel, { bg: string; fg: string }> = {
  none: { bg: theme.border, fg: theme.muted },
  phone: { bg: theme.accentSoft, fg: theme.accentDark },
  photo: { bg: theme.accentSoft, fg: theme.accentDark },
  id: { bg: theme.accent, fg: '#FFFFFF' },
};

export function VerifiedBadge({
  level,
  compact = false,
}: {
  level: VerificationLevel;
  compact?: boolean;
}) {
  const c = COLORS[level];
  const label =
    level === 'none'
      ? 'Unverified'
      : compact
        ? level === 'id'
          ? 'ID ✓'
          : level === 'photo'
            ? 'Photo ✓'
            : 'Phone ✓'
        : VERIFICATION_LABEL[level];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});
