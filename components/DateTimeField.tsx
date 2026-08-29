import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function safeDate(d: Date): Date {
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDateInputValue(d: Date): string {
  const s = safeDate(d);
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
}

function toTimeInputValue(d: Date): string {
  const s = safeDate(d);
  return `${pad(s.getHours())}:${pad(s.getMinutes())}`;
}

const NATIVE_TIMES = ['08:00', '12:00', '17:00', '18:30', '19:00', '20:00'];

/**
 * Cross-platform date + time picker.
 * Web renders real <input type="date"/time"> (a calendar); native falls back to
 * next-7-days chips + common time chips so no native picker dependency is needed.
 */
export function DateTimeField({ label, value, onChange }: Props) {
  const next7 = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const base = safeDate(value);

  const setDatePart = (year: number, month: number, day: number) => {
    const next = new Date(base);
    next.setFullYear(year, month, day);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  const setTimePart = (hours: number, minutes: number) => {
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.webRow}>
          {/* Web-only DOM inputs give a native calendar + clock */}
          <input
            type="date"
            value={toDateInputValue(value)}
            min={toDateInputValue(new Date())}
            onChange={(e) => {
              const parts = e.target.value.split('-').map(Number);
              if (parts.length === 3 && parts.every((n) => Number.isFinite(n)) && parts[0] > 0) {
                setDatePart(parts[0], parts[1] - 1, parts[2]);
              }
            }}
            style={webInputStyle}
          />
          <input
            type="time"
            value={toTimeInputValue(value)}
            onChange={(e) => {
              const parts = e.target.value.split(':').map(Number);
              if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
                setTimePart(parts[0], parts[1]);
              }
            }}
            style={webInputStyle}
          />
        </View>
        <Text style={styles.preview}>{base.toLocaleString()}</Text>
      </View>
    );
  }

  const selectedDay = toDateInputValue(value);
  const selectedTime = toTimeInputValue(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {next7.map((d) => {
          const on = toDateInputValue(d) === selectedDay;
          const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
          const dayNum = d.getDate();
          return (
            <TouchableOpacity
              key={toDateInputValue(d)}
              style={[styles.dateChip, on && styles.chipOn]}
              onPress={() => setDatePart(d.getFullYear(), d.getMonth(), d.getDate())}
              activeOpacity={0.85}
            >
              <Text style={[styles.dateWeekday, on && styles.chipTextOn]}>{weekday}</Text>
              <Text style={[styles.dateNum, on && styles.chipTextOn]}>{dayNum}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.timeWrap}>
        {NATIVE_TIMES.map((t) => {
          const on = selectedTime === t;
          const [h, m] = t.split(':').map(Number);
          return (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, on && styles.chipOn]}
              onPress={() => setTimePart(h, m)}
              activeOpacity={0.85}
            >
              <Text style={[styles.timeText, on && styles.chipTextOn]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.preview}>{base.toLocaleString()}</Text>
    </View>
  );
}

const webInputStyle = {
  backgroundColor: theme.surface,
  borderRadius: 12,
  padding: 12,
  fontSize: 15,
  color: theme.ink,
  border: `1px solid ${theme.border}`,
  flex: 1,
} as const;

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: theme.muted, marginBottom: 8 },
  webRow: { flexDirection: 'row', gap: 10 },
  preview: { marginTop: 8, color: theme.accentDark, fontWeight: '700', fontSize: 13 },
  chipRow: { gap: 8, paddingBottom: 4 },
  dateChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  dateWeekday: { color: '#334155', fontWeight: '600', fontSize: 12 },
  dateNum: { color: theme.ink, fontWeight: '800', fontSize: 16, marginTop: 2 },
  timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  timeChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  timeText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipTextOn: { color: '#FFFFFF' },
});
