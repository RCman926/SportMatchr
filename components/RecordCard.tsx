import { View, Text, StyleSheet } from 'react-native';
import type { PlayerProfile } from '../constants/mockData';
import {
  recordLabel,
  resultTrend,
  sportBreakdown,
  winPercent,
} from '../lib/record';
import { theme } from '../constants/theme';

/** Optional W–L–D + trend. Not a ranked ladder. */
export function RecordCard({ profile }: { profile: PlayerProfile }) {
  const wins = profile.wins ?? 0;
  const losses = profile.losses ?? 0;
  const draws = profile.draws ?? 0;
  const total = wins + losses + draws;
  const pct = winPercent(wins, losses, draws);
  const log = profile.resultLog ?? [];
  const trend = resultTrend(log);
  const sports = sportBreakdown(log);

  if (total <= 0 && log.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Record</Text>
        <Text style={styles.empty}>
          Optional — after a game, log Win / Loss / Draw / Just for fun. No rankings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Record</Text>
      <Text style={styles.hint}>Self-reported · not a ranked ladder</Text>
      <View style={styles.row}>
        <View style={styles.big}>
          <Text style={styles.record}>{recordLabel(wins, losses, draws)}</Text>
          <Text style={styles.sub}>W–L{draws > 0 ? '–D' : ''}</Text>
        </View>
        <View style={styles.big}>
          <Text style={styles.pct}>{pct == null ? '—' : `${pct}%`}</Text>
          <Text style={styles.sub}>Win rate</Text>
        </View>
      </View>
      <Text style={styles.trend}>{trend}</Text>
      {sports.length > 0 ? (
        <View style={styles.sports}>
          {sports.map((s) => (
            <Text key={s.sport} style={styles.sportLine}>
              {s.sport} · {recordLabel(s.wins, s.losses, s.draws)}
              {s.pct != null ? ` · ${s.pct}%` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderLeftWidth: 4,
    borderLeftColor: theme.accent,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.ink,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.mutedSoft,
    marginTop: 2,
    marginBottom: 10,
  },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 19,
    marginTop: 6,
  },
  row: { flexDirection: 'row', gap: 16 },
  big: { flex: 1 },
  record: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 28,
    color: theme.ink,
    letterSpacing: -0.5,
  },
  pct: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 28,
    color: theme.ballDark,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  trend: {
    marginTop: 10,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.accentDark,
  },
  sports: { marginTop: 10, gap: 4 },
  sportLine: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.ink,
  },
});
