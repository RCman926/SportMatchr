import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { submitGameResult, type GameResult } from '../lib/api';
import { theme } from '../constants/theme';

const OPTIONS: { key: GameResult; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'loss', label: 'Loss' },
  { key: 'draw', label: 'Draw' },
  { key: 'fun', label: 'Just for fun' },
];

type Props = {
  sessionId: string;
  sport: string;
  /** Real account required — founder demo should not fake a saved record */
  canAct: boolean;
  onNeedAuth?: () => void;
  onSaved?: (result: GameResult) => void;
};

/** Optional post-game result — no ranking. */
export function ResultPicker({ sessionId, sport, canAct, onNeedAuth, onSaved }: Props) {
  const [saved, setSaved] = useState<GameResult | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = async (result: GameResult) => {
    if (!canAct) {
      onNeedAuth?.();
      Alert.alert('Sign in', 'Create a free account to save your record.');
      return;
    }
    if (sessionId.startsWith('mock-') || sessionId.startsWith('solo-')) {
      Alert.alert('Demo only', 'Results save on real hosted games after you sign in.');
      return;
    }
    setSaving(true);
    const res = await submitGameResult({ sessionId, sport, result });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Couldn’t save', res.error ?? 'Try again');
      return;
    }
    setSaved(result);
    onSaved?.(result);
  };

  if (saved) {
    const label = OPTIONS.find((o) => o.key === saved)?.label ?? saved;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Result saved</Text>
        <Text style={styles.done}>{label} · shows on your profile record</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>How did it go?</Text>
      <Text style={styles.hint}>Optional · builds your win% · not a ranked ladder</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.chip, o.key === 'win' && styles.chipWin, o.key === 'loss' && styles.chipLoss]}
            onPress={() => void pick(o.key)}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.chipText,
                o.key === 'win' && styles.chipTextWin,
                o.key === 'loss' && styles.chipTextLoss,
              ]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  title: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.ink,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.mutedSoft,
    marginTop: 2,
    marginBottom: 8,
  },
  done: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 13,
    color: theme.accentDark,
    marginTop: 4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipWin: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  chipLoss: {
    backgroundColor: theme.ballSoft,
    borderColor: theme.ball,
  },
  chipText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.ink,
  },
  chipTextWin: { color: theme.accentDark },
  chipTextLoss: { color: theme.ballDark },
});
