import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PROFILES } from '../../constants/mockData';
import { WEDGE } from '../../constants/wedge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SafetyGate } from '../../components/SafetyGate';
import { SportFilterBar } from '../../components/SportPicker';
import { useLocationStore } from '../../lib/locationStore';
import { useAuthStore } from '../../lib/authStore';
import { formatDistanceKm, haversineKm, courtCoords } from '../../lib/location';
import { joinSession, listSessions, LiveSession, fetchMyProfile } from '../../lib/api';
import { freePlacesNearYou } from '../../lib/places';
import { ensureFacePhotoForMeetup } from '../../lib/profilePhoto';
import { theme } from '../../constants/theme';
import { LookingPulse } from '../../components/LookingPulse';

export default function HomeScreen() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [source, setSource] = useState<'live' | 'demo'>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const coords = useLocationStore((s) => s.coords);
  const area = useLocationStore((s) => s.area);
  const locSource = useLocationStore((s) => s.source);
  const refreshLoc = useLocationStore((s) => s.refresh);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const nearbyFree = useMemo(
    () => freePlacesNearYou(coords, { sport: sportFilter, limit: 6, seasonAware: true }),
    [coords, sportFilter]
  );

  const load = useCallback(async () => {
    const res = await listSessions(sportFilter, { live: isSignedIn });
    setSessions(res.sessions);
    setSource(res.source);
    if (isSignedIn) {
      const me = await fetchMyProfile();
      setAvatarUrl(me?.avatarUrl ?? null);
    }
    setLoading(false);
  }, [sportFilter, isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const ranked = sessions
    .map((s) => {
      const c = courtCoords(s.courtId) ?? {
        lat: s.lat ?? coords.lat,
        lng: s.lng ?? coords.lng,
      };
      return { ...s, distanceKm: haversineKm(coords, c) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const onJoin = async (id: string) => {
    if (isSignedIn) {
      const ok = await ensureFacePhotoForMeetup({ remoteAvatarUrl: avatarUrl });
      if (!ok) return;
      await joinSession(id);
    }
    router.push({ pathname: '/session/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SportMatchr</Text>
      <Text style={styles.sub}>{WEDGE.copy.homeSub}</Text>

      <LookingPulse />

      {source === 'demo' ? (
        <TouchableOpacity
          style={styles.softNote}
          onPress={() => router.push('/auth')}
          activeOpacity={0.85}
        >
          <Text style={styles.softNoteText}>
            Sample games for a peek — sign in to see who’s actually out.
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.locBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.locLabel}>
            {locSource === 'gps' ? 'Near you' : 'Around'}
          </Text>
          <Text style={styles.locValue}>{area}</Text>
        </View>
        <TouchableOpacity style={styles.locBtn} onPress={() => void refreshLoc()} activeOpacity={0.85}>
          <Text style={styles.locBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.createBtn}
        activeOpacity={0.85}
        onPress={() => (isSignedIn ? router.push('/create') : router.push('/auth'))}
      >
        <Text style={styles.createBtnText}>Host a meetup</Text>
      </TouchableOpacity>

      <SportFilterBar selected={sportFilter} onChange={setSportFilter} />

      <Text style={styles.section}>
        Free places near you{sportFilter ? ` · ${sportFilter}` : ''}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.placeRow}
      >
        {nearbyFree.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.placeCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.placeFree}>Free</Text>
            <Text style={styles.placeName} numberOfLines={2}>
              {p.name}
            </Text>
            <Text style={styles.placeMeta}>
              {formatDistanceKm(p.distanceKm)} · {p.neighbourhood}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.section}>
        Open meetups{sportFilter ? ` · ${sportFilter}` : ''}
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
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
          {ranked.length === 0 && (
            <Text style={styles.empty}>
              Quiet right now
              {sportFilter ? ` for ${sportFilter}` : ''}.{' '}
              {isSignedIn
                ? 'Host something — even two people is a start.'
                : 'Sign in if you want the real board, or host the first one.'}
            </Text>
          )}
          {ranked.map((s) => {
            const host = PROFILES[s.hostId];
            const hostName = s.hostName ?? host?.name ?? 'Host';
            return (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sport}>{s.sport}</Text>
                  <Text style={styles.players}>
                    {formatDistanceKm(s.distanceKm)} · {s.players}/{s.max}
                  </Text>
                </View>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.meta}>
                  {s.time} • {s.location}
                </Text>
                {s.recurring ? <Text style={styles.recurring}>↻ {s.recurring}</Text> : null}
                <View style={styles.hostRow}>
                  <Text style={styles.hostText}>Hosted by {hostName}</Text>
                  {host ? <VerifiedBadge level={host.verification} compact /> : null}
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  activeOpacity={0.85}
                  onPress={() => setPendingId(s.id)}
                >
                  <Text style={styles.joinText}>I’m in</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      <SafetyGate
        visible={!!pendingId}
        title="Heading to this game?"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          const id = pendingId;
          setPendingId(null);
          if (id) void onJoin(id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  header: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 34,
    color: theme.ink,
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.muted,
    marginBottom: 14,
    marginTop: 4,
    lineHeight: 22,
  },
  softNote: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  softNoteText: {
    fontFamily: theme.fonts.body,
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
    textDecorationColor: theme.border,
  },
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  locLabel: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.accent,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  locValue: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    fontSize: 15,
    marginTop: 2,
  },
  locBtn: {
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locBtnText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
  },
  createBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
  section: {
    fontFamily: theme.fonts.display,
    fontSize: 22,
    marginBottom: 12,
    marginTop: 4,
    color: theme.ink,
    letterSpacing: 0.3,
  },
  placeRow: { gap: 10, paddingBottom: 8, marginBottom: 8 },
  placeCard: {
    width: 160,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  placeFree: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeName: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    fontSize: 14,
    marginTop: 4,
    minHeight: 36,
  },
  placeMeta: {
    fontFamily: theme.fonts.body,
    color: theme.muted,
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    fontFamily: theme.fonts.body,
    color: theme.muted,
    marginBottom: 12,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sport: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accent,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  players: {
    color: theme.muted,
    fontSize: 13,
    fontFamily: theme.fonts.bodyMed,
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    marginBottom: 4,
  },
  meta: {
    color: theme.muted,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    marginBottom: 6,
  },
  recurring: {
    color: theme.accentBright,
    fontSize: 12,
    fontFamily: theme.fonts.bodyMed,
    marginBottom: 10,
  },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  hostText: {
    color: theme.ink,
    fontSize: 13,
    fontFamily: theme.fonts.bodyMed,
  },
  joinBtn: {
    backgroundColor: theme.accentSoft,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
  },
});
