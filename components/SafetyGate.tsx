import { Modal, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, ZoomIn, ReduceMotion } from 'react-native-reanimated';
import { theme, cardShadow } from '../constants/theme';
import { PressScale } from './motion';

type Props = {
  visible: boolean;
  title?: string;
  extraTips?: string[];
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SafetyGate({
  visible,
  title = 'Quick check before you go',
  extraTips,
  confirmLabel = 'Got it — let’s go',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
        style={styles.overlay}
      >
        <Animated.View
          entering={ZoomIn.duration(320).springify().damping(16).reduceMotion(ReduceMotion.System)}
          style={[styles.sheet, cardShadow]}
        >
          <Text style={styles.title}>{title}</Text>
          {(extraTips ?? []).map((tip) => (
            <Text key={tip} style={[styles.tip, styles.extraTip]}>
              {tip}
            </Text>
          ))}
          <Text style={styles.tip}>Public court only — never a private address.</Text>
          <Text style={styles.tip}>Look for a real face photo so you recognize them.</Text>
          <Text style={styles.tip}>Tell a friend where you’re headed.</Text>
          <Text style={styles.tip}>If it feels off, leave. Use Report in the session chat.</Text>

          <PressScale onPress={onConfirm} style={styles.confirm} accessibilityLabel={confirmLabel}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </PressScale>
          <PressScale onPress={onCancel} style={styles.cancel} accessibilityLabel="Maybe later">
            <Text style={styles.cancelText}>Maybe later</Text>
          </PressScale>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 33, 28, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 26,
    color: theme.ink,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  tip: {
    fontFamily: theme.fonts.body,
    color: theme.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  extraTip: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyBold,
  },
  confirm: {
    marginTop: 16,
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: theme.muted,
    fontFamily: theme.fonts.bodyMed,
  },
});
