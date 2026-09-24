import { Platform, TextInput, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function DateField({ value, onChange }: Props) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={theme.mutedSoft}
      {...(Platform.OS === 'web' ? ({ type: 'date' } as object) : {})}
    />
  );
}

export function TimeField({ value, onChange }: Props) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder="18:00"
      placeholderTextColor={theme.mutedSoft}
      {...(Platform.OS === 'web' ? ({ type: 'time' } as object) : {})}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontFamily: theme.fonts.body,
  },
});
