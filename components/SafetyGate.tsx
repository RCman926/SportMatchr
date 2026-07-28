import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SAFETY_TIPS } from '../constants/mockData';

type Props = {
  visible: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SafetyGate({
  visible,
  title = 'Stay safe when you meet',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>SAFETY FIRST</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            Meeting strangers for sport is fun — and it should stay safe. Quick rules:
          </Text>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {SAFETY_TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.tip}>{tip}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.confirm} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>I understand — continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  kicker: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sub: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  bullet: {
    color: '#0D9488',
    fontWeight: '800',
  },
  tip: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  confirm: {
    marginTop: 16,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
});
