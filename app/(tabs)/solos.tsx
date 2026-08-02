import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PROFILES, SoloPlayer } from '../../constants/mockData';
import { WEDGE } from '../../constants/wedge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SafetyGate } from '../../components/SafetyGate';
import { SportFilterBar } from '../../components/SportPicker';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import {
  fetchMyProfile,
  goLiveSolo,
  listOnlinePeople,
  listSessions,
  listSolos,
  LiveSession,
  OnlinePerson,
  stopLiveSolo,
} from '../../lib/api';
import { useLocationStore } from '../../lib/locationStore';
import { useAuthStore } from '../../lib/authStore';
import { formatDistanceKm, haversineKm, courtCoords } from '../../lib/location';
import { theme } from '../../constants/theme';
import { ensureFacePhotoForMeetup } from '../../lib/profilePhoto';
import { getSeasonalPopularSports } from '../../constants/sports';

type ViewKey = 'online' | 'looking' | 'games';

type PendingAction = {
  id: string;
  sport: string;
  title: string;
  location: string;
  time: string;
} | null;

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'online', label: 'Online' },
  { key: 'looking', label: 'Looking' },
  { key: 'games', label: 'Games' },
];

export default function SolosScreen() {
  const [view, setView] = useState<ViewKey>('online');
  const [imLive, setImLive] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [playersRaw, setPlayersRaw] = useState<SoloPlayer[]>([]);
  const [onlinePeople, setOnlinePeople] = useState<OnlinePerson[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [source, setSource] = useState<'live' | 'demo'>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const coords = useLocationStore((s) => s.coords);
  const area = useLocationStore((s) => s.area);
  const locSource = useLocationStore((s) => s.source);
  const refreshLoc = useLocationStore((s) => s.refresh);
  const presenceCoords = useLocationStore((s) => s.presenceCoords);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const canAct = useAuthStore((s) => s.canAct);

  const load = useCallback(async () => {
    const [solos, online, games] = await Promise.all([
      listSolos(sportFilter, { live: isSignedIn }),
      listOnlinePeople(),
      listSessions(sportFilter, { live: isSignedIn }),
    ]);
    setPlayersRaw(solos.players);
    setOnlinePeople(online.people);
    setVisitorCount(online.visitorCount);
    setSessions(games.sessions);
    setSource(
      online.source === 'live' || solos.source === 'live' || games.source === 'live'
        ? 'live'
        : 'demo'
    );
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
      const t = setInterval(() => void load(), 20000);
      return () => clearInterval(t);
    }, [load])
  );

  const players = useMemo(() => {
    let list = verifiedOnly
      ? playersRaw.filter((p) => p.verification !== 'none')
      : [...playersRaw];
    return list
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(coords, { lat: p.lat, lng: p.lng }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [playersRaw, verifiedOnly, coords]);

  const rankedGames = useMemo(() => {
    return sessions
      .map((s) => {
        const c = courtCoords(s.courtId) ?? {
          lat: s.lat ?? coords.lat,
          lng: s.lng ?? coords.lng,
        };
        return { ...s, distanceKm: haversineKm(coords, c) };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [sessions, coords]);

  const counts = {
    online: onlinePeople.length + visitorCount,
    looking: playersRaw.length,
    games: sessions.length,
  };

  const openChat = async (action: NonNullable<PendingAction>) => {
    if (canAct) {
      const ok = await ensureFacePhotoForMeetup({ remoteAvatarUrl: avatarUrl });
      if (!ok) return;
    }
    setPending(null);
    router.push({
      pathname: '/session/[id]',
      params: {
        id: `solo-${action.id}`,
        sport: action.sport,
        title: action.title,
        location: action.location,
        time: action.time,
        players: '2',
        max: '4',
      },
    });
  };

  const subCopy =
    view === 'online'
      ? 'Who’s sitting in the app right now — not necessarily looking for a game.'
      : view === 'looking'
        ? `People around ${WEDGE.pocketName} who said they’re free.`
        : 'Open pickup sessions you can join.';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Right now</Text>
      <Text style={styles.sub}>{subCopy}</Text>

      <View style={styles.seg}>
        {VIEWS.map((v) => {
          const on = view === v.key;
          return (
            <TouchableOpacity
              key={v.key}
              style={[styles.segBtn, on && styles.segBtnOn]}
              onPress={() => setView(v.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>{v.label}</Text>
              <Text style={[styles.segCount, on && styles.segCountOn]}>{counts[v.key]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.locBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.locLabel}>
            {locSource === 'gps' ? 'Near' : 'Around'}
          </Text>
          <Text style={styles.locValue}>{area}</Text>
        </View>
        <TouchableOpacity
          style={styles.locBtn}
          onPress={() => void refreshLoc()}
          activeOpacity={0.85}
        >
          <Text style={styles.locBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {view === 'looking' ? (
        <>
          <SportFilterBar selected={sportFilter} onChange={setSportFilter} />
          <TouchableOpacity
            style={[styles.liveBtn, imLive && styles.liveBtnOn]}
            activeOpacity={0.85}
            onPress={async () => {
              if (!canAct) {
                router.push('/auth');
                return;
              }
              const okPhoto = await ensureFacePhotoForMeetup({ remoteAvatarUrl: avatarUrl });
              if (!okPhoto) return;
              const next = !imLive;
              if (next) {
                await refreshLoc();
                const sport =
                  sportFilter ?? getSeasonalPopularSports()[0] ?? WEDGE.primarySport;
                const res = await goLiveSolo(sport, presenceCoords());
                if (!res.ok) {
                  Alert.alert('Could not go live', res.error ?? 'Try again');
                  return;
                }
                setImLive(true);
                await load();
              } else {
                await stopLiveSolo();
                setImLive(false);
                await load();
              }
            }}
          >
            <Text style={[styles.liveBtnText, imLive && styles.liveBtnTextOn]}>
              {imLive ? `You’re looking near ${area}` : 'I’m free — show me on Looking'}
            </Text>
          </TouchableOpacity>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Verified only</Text>
              <Text style={styles.filterHint}>Optional until the feed is full</Text>
            </View>
            <Switch
              value={verifiedOnly}
              onValueChange={setVerifiedOnly}
              trackColor={{ false: '#CBD5E1', true: theme.accent }}
              thumbColor={verifiedOnly ? theme.accent : '#FFFFFF'}
            />
          </View>
        </>
      ) : null}

      {view === 'games' ? (
        <SportFilterBar selected={sportFilter} onChange={setSportFilter} />
      ) : null}

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
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
          {view === 'online' ? (
            <>
              {source === 'demo' ? (
                <Text style={styles.empty}>Sample online list — live once presence connects.</Text>
              ) : null}
              {onlinePeople.length === 0 && visitorCount === 0 ? (
                <Text style={styles.empty}>Quiet — you’re the only one here right now.</Text>
              ) : null}
              {onlinePeople.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/profile/${p.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <ProfileAvatar name={p.name} uri={p.avatarUrl} size={44} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{p.name}</Text>
                        {p.verification ? (
                          <VerifiedBadge level={p.verification} compact />
                        ) : null}
                      </View>
                      <Text style={styles.meta}>
                        {p.neighbourhood ?? WEDGE.pocketName}
                        {p.lookingNow ? ' · looking for a game' : ' · just online'}
                      </Text>
                    </View>
                    <View style={[styles.badge, p.lookingNow ? styles.badgeHot : null]}>
                      <Text style={[styles.badgeText, p.lookingNow ? styles.badgeHotText : null]}>
                        {p.lookingNow ? 'Looking' : 'Online'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {visitorCount > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.name}>
                    {visitorCount === 1
                      ? '1 person browsing'
                      : `${visitorCount} people browsing`}
                  </Text>
                  <Text style={styles.meta}>
                    In the app as guests — no public profile yet.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {view === 'looking' ? (
            <>
              {players.length === 0 ? (
                <Text style={styles.empty}>
                  Nobody’s looking yet. Tap I’m free if you want a game.
                </Text>
              ) : null}
              {players.map((p) => {
                const avatarUrl = PROFILES[p.profileId]?.avatarUrl;
                return (
                  <View key={p.id} style={styles.card}>
                    <TouchableOpacity
                      style={styles.cardHeader}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/profile/${p.profileId}`)}
                    >
                      <ProfileAvatar name={p.name} uri={avatarUrl} size={44} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name}>{p.name}</Text>
                          <VerifiedBadge level={p.verification} compact />
                        </View>
                        <Text style={styles.meta}>
                          {p.neighbourhood} · {formatDistanceKm(p.distanceKm)} · {p.sport}
                        </Text>
                      </View>
                      <View style={[styles.badge, styles.badgeHot]}>
                        <Text style={[styles.badgeText, styles.badgeHotText]}>Looking</Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.looking}>{p.lookingFor}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.msgBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                          setPending({
                            id: p.id,
                            sport: p.sport,
                            title: `Solo with ${p.name}`,
                            location: `Public court · ${p.neighbourhood}`,
                            time: p.available,
                          })
                        }
                      >
                        <Text style={styles.msgText}>Say hi</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.playBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                          setPending({
                            id: p.id,
                            sport: p.sport,
                            title: `Let's play — ${p.sport}`,
                            location: `Meet at public court · ${p.neighbourhood}`,
                            time: 'Now',
                          })
                        }
                      >
                        <Text style={styles.playText}>Play</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          {view === 'games' ? (
            <>
              {rankedGames.length === 0 ? (
                <Text style={styles.empty}>
                  No open games yet.{' '}
                  <Text style={styles.link} onPress={() => router.push('/create')}>
                    Host one
                  </Text>
                </Text>
              ) : null}
              {rankedGames.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({ pathname: '/session/[id]', params: { id: s.id } })
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sportTag}>{s.sport}</Text>
                      <Text style={styles.name}>{s.title}</Text>
                      <Text style={styles.meta}>
                        {s.time} · {s.location} · {formatDistanceKm(s.distanceKm)}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {s.players}/{s.max}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <SafetyGate
        visible={!!pending}
        title="Before you message / meet"
        onCancel={() => setPending(null)}
        onConfirm={() => pending && void openChat(pending)}
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
    fontSize: 15,
    color: theme.muted,
    marginBottom: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  seg: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  segBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  segBtnOn: {
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,
  },
  segLabel: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.muted,
    fontSize: 13,
  },
  segLabelOn: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
  },
  segCount: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    color: theme.ink,
    marginTop: 2,
  },
  segCountOn: {
    color: theme.accentDark,
  },
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
    marginBottom: 12,
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
  liveBtn: {
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBtnOn: { backgroundColor: theme.ball },
  liveBtnText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  liveBtnTextOn: { color: '#FFFFFF' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 10,
    marginBottom: 12,
  },
  filterLabel: { fontFamily: theme.fonts.bodyBold, color: theme.ink },
  filterHint: { color: theme.muted, fontSize: 12, marginTop: 2, fontFamily: theme.fonts.body },
  empty: {
    color: theme.muted,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: theme.fonts.body,
  },
  link: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 17, fontFamily: theme.fonts.bodyBold, color: theme.ink },
  meta: { fontSize: 12, color: theme.muted, marginTop: 2, fontFamily: theme.fonts.body },
  sportTag: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accent,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeHot: { backgroundColor: theme.ball },
  badgeText: { color: theme.accentDark, fontSize: 11, fontFamily: theme.fonts.bodyBold },
  badgeHotText: { color: '#FFFFFF' },
  looking: { fontSize: 15, color: theme.ink, marginBottom: 12, marginTop: 8, fontFamily: theme.fonts.body },
  actions: { flexDirection: 'row', gap: 8 },
  msgBtn: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  msgText: { color: theme.ink, fontFamily: theme.fonts.bodyMed },
  playBtn: {
    flex: 1,
    backgroundColor: theme.accent,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  playText: { color: '#FFFFFF', fontFamily: theme.fonts.bodyBold },
});
