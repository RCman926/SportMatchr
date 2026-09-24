import { Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { PressScale } from './motion';

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <PressScale onPress={onPress} disabled={disabled} style={[styles.primary, style]} accessibilityLabel={label}>
      <Text style={styles.primaryText}>{label}</Text>
    </PressScale>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <PressScale onPress={onPress} style={[styles.ghost, style]} accessibilityLabel={label}>
      <Text style={styles.ghostText}>{label}</Text>
    </PressScale>
  );
}

export function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: theme.ball,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.ballDark,
  },
  primaryText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.surfaceRaised,
    fontSize: 16,
  },
  ghost: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accentDark,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  section: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    color: theme.ink,
    marginBottom: 6,
    marginTop: 8,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.muted,
    marginBottom: 10,
    lineHeight: 18,
  },
});
