import { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { submitReport, ReportInput } from '../lib/api';

type Props = {
  visible: boolean;
  targetType: ReportInput['targetType'];
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
};

const REASONS = [
  'No-show / bailed',
  'Inappropriate behaviour',
  'Fake or misleading profile',
  'Safety concern',
  'Spam',
];

export function ReportSheet({ visible, targetType, targetId, targetLabel, onClose }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setSaving(false);
    setDone(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!reason) return;
    setSaving(true);
    const res = await submitReport({ targetType, targetId, reason, details });
    setSaving(false);
    if (res.ok) {
      setDone(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {done ? (
            <>
              <Text style={styles.title}>Thanks for flagging</Text>
              <Text style={styles.body}>
                We logged your report{targetLabel ? ` about ${targetLabel}` : ''}. If you feel unsafe,
                leave the meetup and contact local authorities.
              </Text>
              <TouchableOpacity style={styles.primary} onPress={close} activeOpacity={0.85}>
                <Text style={styles.primaryText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Report{targetLabel ? ` ${targetLabel}` : ''}</Text>
              <Text style={styles.body}>What’s going on? This is private and helps keep games safe.</Text>
              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const on = reason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.reason, on && styles.reasonOn]}
                      onPress={() => setReason(r)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.reasonText, on && styles.reasonTextOn]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Add details (optional)"
                placeholderTextColor={theme.muted}
                value={details}
                onChangeText={setDetails}
                multiline
              />
              <TouchableOpacity
                style={[styles.primary, (!reason || saving) && styles.primaryDisabled]}
                onPress={submit}
                disabled={!reason || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Send report</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancel} onPress={close} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
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
  title: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.ink, marginBottom: 8, letterSpacing: 0.3 },
  body: { fontFamily: theme.fonts.body, color: theme.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  reasons: { gap: 8, marginBottom: 12 },
  reason: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.bg,
  },
  reasonOn: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
  reasonText: { color: theme.ink, fontFamily: theme.fonts.bodyMed, fontSize: 14 },
  reasonTextOn: { color: theme.accentDark, fontFamily: theme.fonts.bodyBold },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    minHeight: 60,
    color: theme.ink,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: theme.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontFamily: theme.fonts.bodyBold, fontSize: 15 },
  cancel: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: theme.muted, fontFamily: theme.fonts.bodyMed },
});
