import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { WEDGE } from '../../constants/wedge';
import { theme } from '../../constants/theme';
import { listMySessions, LiveSession } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';
import { SessionWhoTags } from '../../components/SessionWhoTags';
import { PageHero, SportBox, SportPoster } from '../../components/SportScene';
import { PressScale } from '../../components/motion';
import { getSeasonalPopularSports } from '../../constants/sports';
import { goToAuth } from '../../lib/pendingAuth';

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const canAct = useAuthStore((s) => s.canAct);
  const isFounderPreview = useAuthStore((s) => s.isFounderPreview);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const list = await listMySessions();
    setSessions(list);
    setLoading(false);
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <PageHero title="Your games" caption={`Hosted or joined · ${WEDGE.city}`} />
      <Text style={styles.sub}>
        Open chat · rematch · next week. This list is yours — open games live on Play.
      </Text>

      {!canAct ? (
        <PressScale
          style={styles.create}
          onPress={() => goToAuth({ kind: 'create', when: 'tonight' })}
          accessibilityLabel="Sign up free"
        >
          <Text style={styles.createText}>Sign up free to save your games</Text>
        </PressScale>
      ) : (
        <PressScale
          style={styles.create}
          onPress={() => router.push({ pathname: '/create', params: { when: 'tonight' } })}
          accessibilityLabel="Host tonight"
        >
          <Text style={styles.createText}>+ Host tonight</Text>
        </PressScale>
      )}

      {isFounderPreview && !isSignedIn ? (
        <Text style={styles.empty}>
          Founder preview: host from Home — your games list fills with a real account.
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={theme.ball} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          {sessions.length === 0 && isSignedIn ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.empty}>No games yet. Host tonight or tap I’m in on Play.</Text>
              <View style={styles.emptyMarks}>
                {getSeasonalPopularSports().slice(0, 4).map((s) => (
                  <View key={s} style={styles.emptyPoster}>
                    <SportPoster sport={s} width="100%" height={88} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {sessions.map((s) => (
            <TouchableOpacity
              key={`${s.id}-${s.role}`}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: s.id, recurring: s.recurring ?? '' },
                })
              }
            >
              <SportBox sport={s.sport}>
                <View style={styles.row}>
                  <Text style={styles.role}>{s.role ?? 'Joined'}</Text>
                </View>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.meta}>
                  {s.time} · {s.location}
                </Text>
                <SessionWhoTags
                  playMix={s.playMix}
                  ageGroup={s.ageGroup}
                  skillLevel={s.skillLevel}
                />
                {s.recurring ? <Text style={styles.recurring}>↻ {s.recurring}</Text> : null}
                <Text style={styles.chatLink}>Open group chat →</Text>
              </SportBox>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  header: { fontSize: 24, fontFamily: theme.fonts.displayBold, color: theme.ink },
  sub: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 12,
    lineHeight: 20,
    fontFamily: theme.fonts.body,
  },
  create: {
    backgroundColor: theme.ball,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createText: { color: '#FFFFFF', fontFamily: theme.fonts.bodyBold },
  empty: { color: theme.muted, marginBottom: 12, fontFamily: theme.fonts.body },
  emptyBlock: { marginBottom: 12 },
  emptyMarks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyPoster: { width: '48%' as unknown as number, flexGrow: 1, flexBasis: '47%' },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  sport: { fontFamily: theme.fonts.bodyBold, color: theme.ballDark, fontSize: 14 },
  role: { color: theme.muted, fontSize: 13 },
  title: {
    fontSize: 17,
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    marginBottom: 4,
  },
  meta: { color: theme.muted, fontSize: 13, fontFamily: theme.fonts.body },
  recurring: {
    marginTop: 6,
    color: theme.accent,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
  },
  chatLink: {
    marginTop: 10,
    color: theme.ballDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
  },
});
