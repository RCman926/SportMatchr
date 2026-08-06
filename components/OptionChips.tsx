import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BookingOption } from '../constants/booking';
import { theme } from '../constants/theme';

type Props = {
  label: string;
  hint?: string;
  options: BookingOption[];
  selected: string;
  onChange: (value: string) => void;
};

/** A labeled single-select row of pill chips — used for gender / age / skill choices. */
export function OptionChips({ label, hint, options, selected, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const on = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.muted,
    marginBottom: 4,
  },
  hint: { color: theme.muted, fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
