import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SafetyGate({
  visible,
  title = 'Quick check before you go',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.tip}>Public court only — never a private address.</Text>
          <Text style={styles.tip}>Look for a real face photo so you recognize them.</Text>
          <Text style={styles.tip}>Tell a friend where you’re headed.</Text>
          <Text style={styles.tip}>If it feels off, leave. You can report later.</Text>

          <TouchableOpacity style={styles.confirm} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>Got it — let’s go</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
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
