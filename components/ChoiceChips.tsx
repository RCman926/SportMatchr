import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { PressScale } from './motion';

type Option<T extends string> = { key: T; label: string };

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const on = value === opt.key;
        return (
          <PressScale
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.text, on && styles.textOn]}>{opt.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  chipOn: {
    backgroundColor: theme.ballSoft,
    borderColor: theme.ball,
  },
  text: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyMed,
    fontSize: 14,
  },
  textOn: {
    color: theme.ballDark,
    fontFamily: theme.fonts.bodyBold,
  },
});
