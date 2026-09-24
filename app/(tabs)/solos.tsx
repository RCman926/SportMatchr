import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { shareLookingBlurb } from '../../lib/share';
import { goToAuth } from '../../lib/pendingAuth';
import { ensureNotifyPermission } from '../../lib/notify';
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
  startMeetupWithLooking,
  stopLiveSolo,
} from '../../lib/api';
import { useLocationStore } from '../../lib/locationStore';
import { useAuthStore } from '../../lib/authStore';
import { formatDistanceKm, haversineKm, courtCoords } from '../../lib/location';
import { theme } from '../../constants/theme';
import { ensureFacePhotoForMeetup } from '../../lib/profilePhoto';
import { getSeasonalPopularSports } from '../../constants/sports';
import { HangoutChat } from '../../components/HangoutChat';
import { SessionWhoTags } from '../../components/SessionWhoTags';
import { PageHero, SportBox, SportScene } from '../../components/SportScene';
import { PressScale, FadeUp } from '../../components/motion';

type ViewKey = 'hangout' | 'looking' | 'games' | 'online';

type PendingAction = {
  id: string;
  sport: string;
  title: string;
  location: string;
  time: string;
} | null;

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'hangout', label: 'Hangout' },
  { key: 'looking', label: 'Looking' },
  { key: 'games', label: 'Games' },
  { key: 'online', label: 'Online' },
];

function parseView(v?: string): ViewKey | null {
  if (v === 'hangout' || v === 'looking' || v === 'games' || v === 'online') return v;
  return null;
}

export default function SolosScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const initialView: ViewKey = parseView(params.view) ?? 'hangout';
  const [view, setView] = useState<ViewKey>(initialView);
  const [imLive, setImLive] = useState(false);

  useEffect(() => {
    const next = parseView(params.view);
    if (next) setView(next);
  }, [params.view]);
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
      listSolos(sportFilter),
      listOnlinePeople(),
      listSessions(sportFilter),
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
      setImLive(Boolean(me?.lookingNow));
    } else {
      setImLive(false);
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

  const counts: Record<ViewKey, number | string> = {
    hangout: '·',
    looking: playersRaw.length,
    games: sessions.length,
    online: onlinePeople.length + visitorCount,
  };

  const openChat = async (action: NonNullable<PendingAction>) => {
    if (!canAct) {
      goToAuth({ kind: 'looking' });
      return;
    }
    const ok = await ensureFacePhotoForMeetup({ remoteAvatarUrl: avatarUrl });
    if (!ok) return;
    setPending(null);

    if (!isSignedIn) {
      // Founder preview click-through
      router.push({
        pathname: '/session/[id]',
        params: {
          id: `mock-meetup-${action.id}`,
          sport: action.sport,
          title: action.title,
          location: action.location,
          time: action.time,
          players: '2',
          max: '4',
        },
      });
      return;
    }

    const meetup = await startMeetupWithLooking({
      otherUserId: action.id,
      sport: action.sport,
      title: action.title,
      location: action.location,
    });
    if (meetup.error || !meetup.id) {
      Alert.alert('Could not start chat', meetup.error ?? 'Try again');
      return;
    }
    router.push({
      pathname: '/session/[id]',
      params: {
        id: meetup.id,
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
    view === 'hangout'
      ? 'Open chat — sport, place, or just company. Plans can form here.'
      : view === 'online'
        ? 'Who’s in the app nearby.'
        : view === 'looking'
          ? 'Free right now — message them.'
          : 'Open games you can join tonight.';

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
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
      <PageHero
        sport={sportFilter}
        caption={
          view === 'hangout'
            ? 'Hangout · Ottawa'
            : view === 'looking'
              ? 'Ready now'
              : view === 'games'
                ? 'Open games tonight'
                : 'Who’s online'
        }
      />
      <Text style={styles.sub}>{subCopy}</Text>

      <View style={styles.seg}>
        {VIEWS.map((v) => {
          const on = view === v.key;
          return (
            <PressScale
              key={v.key}
              style={[styles.segBtn, on && styles.segBtnOn]}
              onPress={() => setView(v.key)}
              accessibilityLabel={v.label}
            >
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>{v.label}</Text>
              <Text style={[styles.segCount, on && styles.segCountOn]}>{counts[v.key]}</Text>
            </PressScale>
          );
        })}
      </View>

      {view !== 'hangout' ? (
        <View style={styles.locBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.locLabel}>
              {locSource === 'gps' ? 'Near' : locSource === 'manual' ? 'Your area' : 'Around'}
            </Text>
            <Text style={styles.locValue}>{area}</Text>
          </View>
          <TouchableOpacity
            style={styles.locBtn}
            onPress={() => void refreshLoc({ forcePrompt: true })}
            activeOpacity={0.85}
          >
            <Text style={styles.locBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {view === 'hangout' ? <HangoutChat area={area} /> : null}

      {view === 'looking' ? (
        <>
          <SportFilterBar selected={sportFilter} onChange={setSportFilter} />
          <PressScale
            style={[styles.liveBtn, imLive && styles.liveBtnOn]}
            accessibilityLabel={imLive ? 'Stop showing as ready' : 'I’m ready'}
            onPress={async () => {
              if (!canAct) {
                goToAuth({ kind: 'looking' });
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
                await ensureNotifyPermission({ force: true });
                await load();
                const share = await shareLookingBlurb();
                if (share === 'copied') {
                  const tip =
                    'You’re live. Invite text copied — paste it to a friend so they know you’re free.';
                  if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(tip);
                  else Alert.alert('You’re live', tip);
                }
              } else {
                await stopLiveSolo();
                setImLive(false);
                await load();
              }
            }}
          >
            <Text style={[styles.liveBtnText, imLive && styles.liveBtnTextOn]}>
              {imLive ? `You’re ready near ${area}` : 'I’m ready — show me on Looking'}
            </Text>
          </PressScale>
          {imLive ? (
            <TouchableOpacity
              style={styles.shareLiveBtn}
              activeOpacity={0.85}
              onPress={async () => {
                const share = await shareLookingBlurb();
                if (share === 'copied') {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.alert('Copied — paste it in WhatsApp or Texts.');
                  } else {
                    Alert.alert('Copied', 'Paste it in WhatsApp or Texts.');
                  }
                }
              }}
            >
              <Text style={styles.shareLiveText}>Text a friend you’re free</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Verified only</Text>
              <Text style={styles.filterHint}>Keep off while the feed is growing</Text>
            </View>
            <Switch
              value={verifiedOnly}
              onValueChange={setVerifiedOnly}
              trackColor={{ false: '#CBD5E1', true: theme.ball }}
              thumbColor={verifiedOnly ? theme.ball : '#FFFFFF'}
            />
          </View>
        </>
      ) : null}

      {view === 'games' ? (
        <SportFilterBar selected={sportFilter} onChange={setSportFilter} />
      ) : null}

      {view !== 'hangout' && loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20, marginBottom: 40 }} />
      ) : view !== 'hangout' ? (
        <>
          {view === 'online' ? (
            <>
              {onlinePeople.length === 0 && visitorCount === 0 ? (
                <Text style={styles.empty}>Quiet here — tap I’m ready so someone nearby can find you tonight.</Text>
              ) : null}
              {onlinePeople.map((p) => (
                <FadeUp key={p.id} delay={30}>
                <TouchableOpacity
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
                </FadeUp>
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
                  Nobody’s ready yet. Tap I’m ready if you want a game tonight.
                </Text>
              ) : null}
              {players.map((p) => {
                const avatarUrl = p.avatarUrl ?? PROFILES[p.profileId]?.avatarUrl;
                return (
                  <FadeUp key={p.id} delay={40}>
                  <View style={styles.card}>
                    <View style={styles.sceneBleed}>
                      <SportScene sport={p.sport} height={96} />
                    </View>
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
                          {p.neighbourhood} · {formatDistanceKm(p.distanceKm)}
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
                  </FadeUp>
                );
              })}
            </>
          ) : null}

          {view === 'games' ? (
            <>
              {rankedGames.length === 0 ? (
                <Text style={styles.empty}>
                  No open games yet.{' '}
                  <Text
                    style={styles.link}
                    onPress={() => router.push({ pathname: '/create', params: { when: 'tonight' } })}
                  >
                    Host tonight
                  </Text>
                </Text>
              ) : null}
              {rankedGames.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({ pathname: '/session/[id]', params: { id: s.id } })
                  }
                >
                  <SportBox sport={s.sport}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{s.title}</Text>
                        <Text style={styles.meta}>
                          {s.time} · {s.location} · {formatDistanceKm(s.distanceKm)}
                        </Text>
                        <SessionWhoTags
                          playMix={s.playMix}
                          ageGroup={s.ageGroup}
                          skillLevel={s.skillLevel}
                        />
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {s.players}/{s.max}
                        </Text>
                      </View>
                    </View>
                  </SportBox>
                </TouchableOpacity>
              ))}
            </>
          ) : null}
        </>
      ) : null}
      <View style={{ height: 28 }} />
      </ScrollView>

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
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 28, flexGrow: 1 },
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  segBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  segBtnOn: {
    borderColor: theme.accentDark,
    backgroundColor: theme.accent,
  },
  segLabel: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.muted,
    fontSize: 12,
  },
  segLabelOn: {
    color: theme.surfaceRaised,
    fontFamily: theme.fonts.bodyBold,
  },
  segCount: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.ink,
    marginTop: 2,
  },
  segCountOn: {
    color: theme.surfaceRaised,
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
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  shareLiveBtn: {
    marginTop: -4,
    marginBottom: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareLiveText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.ballDark,
    textDecorationLine: 'underline',
  },
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  sceneBleed: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
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
