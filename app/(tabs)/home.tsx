import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { PROFILES } from '../../constants/mockData';
import { WEDGE } from '../../constants/wedge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SafetyGate } from '../../components/SafetyGate';
import { SportFilterBar } from '../../components/SportPicker';
import { useLocationStore } from '../../lib/locationStore';
import { useAuthStore } from '../../lib/authStore';
import { AREA_PRESETS, formatDistanceKm, haversineKm, courtCoords } from '../../lib/location';
import { AreaChoice, resolveAreaQuery, suggestLocalAreas } from '../../lib/ottawaAreas';
import {
  joinSession,
  listSessions,
  LiveSession,
  fetchMyProfile,
  fetchPlaceRatingStats,
  ratePlace,
  PlaceRatingStats,
} from '../../lib/api';
import { freePlacesNearYou } from '../../lib/places';
import { ensureFacePhotoForMeetup } from '../../lib/profilePhoto';
import { dismissPhotoNudge, isPhotoNudgeDismissed } from '../../lib/photoNudge';
import { theme, cardShadow } from '../../constants/theme';
import { LookingPulse } from '../../components/LookingPulse';
import { PrimaryButton, GhostButton, SectionLabel } from '../../components/ui';
import { PressScale, FadeUp } from '../../components/motion';
import { CourtSurface } from '../../components/CourtSurface';
import { goToAuth } from '../../lib/pendingAuth';
import { StarRating } from '../../components/StarRating';
import { SessionWhoTags } from '../../components/SessionWhoTags';
import { PageHero, SportBox, SportPoster, SportSceneStrip } from '../../components/SportScene';
import { OTTAWA_COURTS } from '../../constants/ottawaCourts';
import { FEMALE_ONLY_JOIN_TIP } from '../../lib/sessionFilters';
import { getSeasonalPopularSports } from '../../constants/sports';

const PLACES_PAGE = 5;

export default function HomeScreen() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPhotoNudge, setShowPhotoNudge] = useState(false);
  const [placeRatings, setPlaceRatings] = useState<Record<string, PlaceRatingStats>>({});
  const [placesShown, setPlacesShown] = useState(PLACES_PAGE);
  const [areaQuery, setAreaQuery] = useState('');
  const [areaSuggestions, setAreaSuggestions] = useState<AreaChoice[]>([]);
  const [areaResolving, setAreaResolving] = useState(false);
  const [areaSearchError, setAreaSearchError] = useState<string | null>(null);
  const [areaOpen, setAreaOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);

  const coords = useLocationStore((s) => s.coords);
  const area = useLocationStore((s) => s.area);
  const locSource = useLocationStore((s) => s.source);
  const needsLocation = useLocationStore((s) => s.needsLocation);
  const locErrorHint = useLocationStore((s) => s.errorHint);
  const locLoading = useLocationStore((s) => s.loading);
  const refreshLoc = useLocationStore((s) => s.refresh);
  const setManualArea = useLocationStore((s) => s.setManualArea);
  const setCustomArea = useLocationStore((s) => s.setCustomArea);

  const applyAreaChoice = useCallback((choice: AreaChoice) => {
    setCustomArea(choice.label, choice.coords);
    setAreaQuery('');
    setAreaSuggestions([]);
    setAreaSearchError(null);
  }, [setCustomArea]);

  const runAreaSearch = useCallback(async () => {
    const q = areaQuery.trim();
    if (q.length < 2) {
      setAreaSearchError('Type a neighbourhood (e.g. Westboro, Riverside South).');
      return;
    }
    setAreaResolving(true);
    setAreaSearchError(null);
    try {
      const res = await resolveAreaQuery(q);
      setAreaSuggestions(res.suggestions);
      if (res.choice) applyAreaChoice(res.choice);
      else setAreaSearchError(res.error ?? 'No match found.');
    } finally {
      setAreaResolving(false);
    }
  }, [areaQuery, applyAreaChoice]);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const canAct = useAuthStore((s) => s.canAct);
  const isFounderPreview = useAuthStore((s) => s.isFounderPreview);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push(canAct ? '/create' : '/auth')}
          style={{ marginRight: 12, paddingVertical: 6, paddingHorizontal: 10 }}
          accessibilityRole="button"
          accessibilityLabel={canAct ? 'Host a game' : 'Sign up'}
        >
          <Text
            style={{
              fontFamily: theme.fonts.bodyBold,
              color: theme.ball,
              fontSize: 15,
            }}
          >
            {canAct ? 'Host' : 'Sign up'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, canAct]);

  const nearbyFree = useMemo(
    () =>
      freePlacesNearYou(coords, {
        sport: sportFilter,
        limit: 40,
        seasonAware: true,
        ratingById: placeRatings,
      }),
    [coords, sportFilter, placeRatings]
  );

  const visiblePlaces = nearbyFree.slice(0, placesShown);

  const sportsLabel = (sports: string[]) => {
    if (sportFilter) return sportFilter;
    const top = sports.slice(0, 3);
    const extra = sports.length - top.length;
    return extra > 0 ? `${top.join(' · ')} +${extra}` : top.join(' · ');
  };

  const load = useCallback(async () => {
    const res = await listSessions(sportFilter);
    setSessions(res.sessions);
    setLoadError(res.error ?? null);
    if (isSignedIn) {
      const me = await fetchMyProfile();
      const url = me?.avatarUrl ?? null;
      setAvatarUrl(url);
      setShowPhotoNudge(!url && !isPhotoNudgeDismissed());
    } else {
      setAvatarUrl(null);
      setShowPhotoNudge(false);
    }
    const nearbyIds = freePlacesNearYou(coords, {
      sport: sportFilter,
      limit: 40,
      seasonAware: true,
    }).map((p) => p.id);
    const ratings = await fetchPlaceRatingStats(nearbyIds);
    setPlaceRatings(ratings);
    setLoading(false);
  }, [sportFilter, isSignedIn, coords]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPlacesShown(PLACES_PAGE);
      void load();
    }, [load])
  );

  const onRatePlace = async (placeId: string, stars: number) => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const res = await ratePlace(placeId, stars);
    if (!res.ok) {
      Alert.alert('Couldn’t save rating', res.error ?? 'Try again');
      return;
    }
    const next = await fetchPlaceRatingStats(
      nearbyFree.map((p) => p.id).slice(0, 40)
    );
    setPlaceRatings(next);
  };

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
    if (!canAct) {
      goToAuth({ kind: 'join', id });
      return;
    }
    const ok = await ensureFacePhotoForMeetup({ remoteAvatarUrl: avatarUrl });
    if (!ok) return;
    if (isSignedIn) {
      const joined = await joinSession(id);
      if (!joined) {
        Alert.alert('Couldn’t join', 'This game may be full or no longer open.');
        return;
      }
    }
    router.push({ pathname: '/session/[id]', params: { id } });
  };

  return (
    <CourtSurface>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
          title="SportMatchr"
          caption={sportFilter ? sportFilter : `${area} · free public places`}
        />

        <LookingPulse />

        {showPhotoNudge && canAct ? (
          <View style={styles.photoNudge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoNudgeTitle}>Add a face photo</Text>
              <Text style={styles.photoNudgeBody}>
                So people recognize you at the court — clearer and safer meetups.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoNudgeBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.photoNudgeBtnText}>Add photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                dismissPhotoNudge();
                setShowPhotoNudge(false);
              }}
              hitSlop={8}
            >
              <Text style={styles.photoNudgeSkip}>Not now</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isFounderPreview && !isSignedIn ? (
          <View style={styles.founderBanner}>
            <Text style={styles.softNoteText}>
              You’re on SAMPLE data. Friends on the normal link see the empty live board.
            </Text>
            <TouchableOpacity
              onPress={async () => {
                await useAuthStore.getState().exitFounderPreview();
                if (typeof window !== 'undefined') window.location.reload();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.founderExit}>Show live board</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!canAct ? (
          <Text style={styles.softNoteText}>
            Create a free account to host, join games, or say you’re free on Looking.
          </Text>
        ) : null}

        <PrimaryButton
          label={canAct ? 'Host tonight' : 'Sign up free'}
          onPress={() =>
            canAct
              ? router.push({ pathname: '/create', params: { when: 'tonight' } })
              : goToAuth({
                  kind: 'create',
                  when: 'tonight',
                  ...(sportFilter ? { sport: sportFilter } : {}),
                })
          }
          style={{ marginBottom: 4 }}
        />
        <GhostButton
          label="I’m ready"
          onPress={() =>
            canAct
              ? router.push({ pathname: '/(tabs)/solos', params: { view: 'looking' } })
              : goToAuth({ kind: 'looking' })
          }
          style={{ marginBottom: 12, alignItems: 'flex-start' }}
        />

        <View style={styles.locBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.locLabel}>Near</Text>
            <Text style={styles.locValue}>{area}</Text>
          </View>
          <TouchableOpacity
            style={styles.locBtn}
            onPress={() => setAreaOpen((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={styles.locBtnText}>{areaOpen ? 'Hide' : 'Change'}</Text>
          </TouchableOpacity>
        </View>
        {areaOpen ? (
          <View style={styles.locHelp}>
            {needsLocation || locSource === 'fallback' || locErrorHint ? (
              <Text style={styles.locWarn}>
                {locErrorHint ||
                  'GPS isn’t set yet. Type your neighbourhood, tap a shortcut, or Use my location.'}
              </Text>
            ) : (
              <Text style={styles.locHint}>Type any Ottawa area, or quick-pick:</Text>
            )}
            <View style={styles.areaSearchRow}>
              <TextInput
                style={styles.areaInput}
                value={areaQuery}
                onChangeText={(t) => {
                  setAreaQuery(t);
                  setAreaSearchError(null);
                  setAreaSuggestions(suggestLocalAreas(t, 8));
                }}
                placeholder="Type area — Westboro, Kanata Lakes, Manotick…"
                placeholderTextColor={theme.mutedSoft}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void runAreaSearch()}
              />
              <TouchableOpacity
                style={styles.areaSetBtn}
                onPress={() => void runAreaSearch()}
                activeOpacity={0.85}
                disabled={areaResolving}
              >
                <Text style={styles.areaSetBtnText}>{areaResolving ? '…' : 'Set'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.locBtn, needsLocation && styles.locBtnEmphasis, { alignSelf: 'flex-start', marginBottom: 8 }]}
              onPress={async () => {
                if (locLoading) return;
                const { ok, errorHint } = await refreshLoc({ forcePrompt: true });
                if (ok) return;
                const tip =
                  errorHint ||
                  (Platform.OS === 'web'
                    ? 'Browser may say Allowed, but Windows Location must be ON. Or type/pick below.'
                    : 'Turn on location permission, then try again.');
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.alert(`Couldn’t get GPS\n\n${tip}`);
                } else {
                  Alert.alert('Couldn’t get GPS', tip);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.locBtnText, needsLocation && styles.locBtnTextEmphasis]}>
                {locLoading ? 'Locating…' : 'Use my location'}
              </Text>
            </TouchableOpacity>
            {areaSearchError ? <Text style={styles.locWarn}>{areaSearchError}</Text> : null}
            {areaSuggestions.length > 0 ? (
              <View style={styles.areaSuggestList}>
                {areaSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.areaSuggestRow}
                    onPress={() => applyAreaChoice(s)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.areaSuggestText}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <View style={styles.areaChips}>
              {AREA_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.areaChip,
                    (locSource === 'manual' ? area === p.label : false) && styles.areaChipOn,
                    locSource !== 'manual' && area === p.label && styles.areaChipSoft,
                  ]}
                  onPress={() => {
                    setManualArea(p.id);
                    setAreaQuery('');
                    setAreaSuggestions([]);
                    setAreaSearchError(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.areaChipText,
                      locSource === 'manual' && area === p.label && styles.areaChipTextOn,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <SectionLabel
          title={`Open games${sportFilter ? ` · ${sportFilter}` : ''}`}
        />

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 24, marginBottom: 40 }} />
        ) : loadError ? (
          <View style={styles.loadError}>
            <Text style={styles.loadErrorTitle}>Live games are waking up</Text>
            <Text style={styles.loadErrorBody}>{loadError}</Text>
            <PressScale style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </PressScale>
          </View>
        ) : ranked.length === 0 ? (
          <FadeUp delay={120}>
          <View style={[styles.emptyInvite, cardShadow]}>
            <Text style={styles.emptyInviteTitle}>
              Start tonight’s{sportFilter ? ` ${sportFilter}` : ''} board
            </Text>
            <Text style={styles.emptyInviteBody}>
              Pick a free public place near {area}. People can join the chat, or you can say you’re
              free on Looking.
            </Text>
            <View style={styles.emptyMarks}>
              {getSeasonalPopularSports().slice(0, 4).map((s) => (
                <View key={s} style={styles.emptyPoster}>
                  <SportPoster sport={s} width="100%" />
                </View>
              ))}
            </View>
            <PressScale
              style={styles.emptyInviteBtn}
              accessibilityLabel={canAct ? 'Host tonight' : 'Sign up to host'}
              onPress={() =>
                canAct
                  ? router.push({
                      pathname: '/create',
                      params: {
                        when: 'tonight',
                        ...(sportFilter ? { sport: sportFilter } : {}),
                      },
                    })
                  : goToAuth({
                      kind: 'create',
                      when: 'tonight',
                      ...(sportFilter ? { sport: sportFilter } : {}),
                    })
              }
            >
              <Text style={styles.emptyInviteBtnText}>
                {canAct ? 'Host tonight' : 'Sign up to host'}
              </Text>
            </PressScale>
            <PressScale
              style={styles.emptyInviteGhost}
              accessibilityLabel={canAct ? 'I’m ready' : 'Sign up'}
              onPress={() =>
                canAct
                  ? router.push({ pathname: '/(tabs)/solos', params: { view: 'looking' } })
                  : goToAuth({ kind: 'looking' })
              }
            >
              <Text style={styles.emptyInviteGhostText}>
                {canAct ? 'I’m ready instead' : 'Sign up'}
              </Text>
            </PressScale>
          </View>
          </FadeUp>
        ) : (
          ranked.map((s) => {
            const host = isFounderPreview && !isSignedIn ? PROFILES[s.hostId] : undefined;
            const hostName = s.hostName ?? host?.name ?? 'Host';
            return (
              <SportBox key={s.id} sport={s.sport}>
                <View style={styles.cardHeader}>
                  <Text style={styles.players}>
                    {formatDistanceKm(s.distanceKm)} · {s.players}/{s.max}
                  </Text>
                </View>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.meta}>
                  {s.time} • {s.location}
                </Text>
                <SessionWhoTags
                  playMix={s.playMix}
                  ageGroup={s.ageGroup}
                  skillLevel={s.skillLevel}
                />
                {s.recurring ? <Text style={styles.recurring}>↻ {s.recurring}</Text> : null}
                <View style={styles.hostRow}>
                  <Text style={styles.hostText}>Hosted by {hostName}</Text>
                  {host ? <VerifiedBadge level={host.verification} compact /> : null}
                </View>
                <PressScale
                  style={styles.joinBtn}
                  accessibilityLabel="I’m in"
                  onPress={() => setPendingId(s.id)}
                >
                  <Text style={styles.joinText}>I’m in</Text>
                </PressScale>
              </SportBox>
            );
          })
        )}

        {!placesOpen && ranked.length === 0 && !loading ? (
          <TouchableOpacity
            style={styles.showPlacesBtn}
            activeOpacity={0.85}
            onPress={() => setPlacesOpen(true)}
          >
            <Text style={styles.showPlacesText}>Show free places near you</Text>
          </TouchableOpacity>
        ) : null}

        <SportFilterBar selected={sportFilter} onChange={setSportFilter} />

        {placesOpen || ranked.length > 0 || loading ? (
          <>
        <View style={styles.sectionRow}>
          <Text style={[styles.section, { flex: 1, marginBottom: 0 }]}>
            Free places near you{sportFilter ? ` · ${sportFilter}` : ''}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/map')} activeOpacity={0.85}>
            <Text style={styles.sectionLink}>Map</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHint}>
          Closest first · well-rated spots float up. Tap stars to rate a place (1–5).
        </Text>

        {visiblePlaces.map((p) => {
          const rating = placeRatings[p.id];
          const popular =
            Boolean(rating && rating.ratingCount >= 2 && rating.avgStars >= 4);
          const displayStars = rating?.myStars ?? rating?.avgStars ?? 0;
          return (
            <View key={p.id} style={styles.placeRowCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/map')}
              >
                <View style={styles.placeRowTop}>
                  <Text style={styles.placeFree}>Free</Text>
                  {popular ? <Text style={styles.popularBadge}>Popular</Text> : null}
                  <Text style={styles.placeDist}>
                    {formatDistanceKm(p.distanceKm)} · {p.neighbourhood}
                  </Text>
                </View>
                <Text style={styles.placeName}>{p.name}</Text>
                <View style={styles.placeMarkRow}>
                  <SportSceneStrip sports={p.sports} />
                </View>
                <Text style={styles.placeSports} numberOfLines={2}>
                  {sportsLabel(p.sports)}
                </Text>
              </TouchableOpacity>
              <View style={styles.placeRateRow}>
                <StarRating
                  value={displayStars}
                  count={rating?.ratingCount ?? 0}
                  interactive
                  onRate={(stars) => void onRatePlace(p.id, stars)}
                />
              </View>
            </View>
          );
        })}

        {placesShown < nearbyFree.length ? (
          <TouchableOpacity
            style={styles.showMoreBtn}
            activeOpacity={0.85}
            onPress={() => setPlacesShown((n) => n + PLACES_PAGE)}
          >
            <Text style={styles.showMoreText}>
              Show more places ({nearbyFree.length - placesShown} left)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.showMoreBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.showMoreText}>
              See all {OTTAWA_COURTS.filter((c) => c.type === 'free').length}+ free places on the map →
            </Text>
          </TouchableOpacity>
        )}
          </>
        ) : null}
        <View style={styles.bottomPad} />
      </ScrollView>

      <SafetyGate
        visible={!!pendingId}
        title="Heading to this game?"
        extraTips={
          ranked.find((s) => s.id === pendingId)?.playMix === 'female_only'
            ? [FEMALE_ONLY_JOIN_TIP]
            : undefined
        }
        confirmLabel={
          ranked.find((s) => s.id === pendingId)?.playMix === 'female_only'
            ? 'Yes — I’m in'
            : undefined
        }
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          const id = pendingId;
          setPendingId(null);
          if (id) void onJoin(id);
        }}
      />
    </CourtSurface>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  bottomPad: { height: 24 },
  kicker: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    color: theme.accentDark,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  header: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 34,
    color: theme.ink,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  sub: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 15,
    color: theme.muted,
    marginBottom: 12,
    marginTop: 6,
    lineHeight: 21,
  },
  softNoteText: {
    fontFamily: theme.fonts.body,
    color: theme.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  founderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  founderExit: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    color: theme.accentDark,
    marginBottom: 10,
  },
  photoNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  photoNudgeTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.ink,
  },
  photoNudgeBody: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  photoNudgeBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoNudgeBtnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  photoNudgeSkip: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.muted,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 16,
  },
  createBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.ball,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.ballDark,
  },
  createBtnSolo: {
    flex: 0,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryCta: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.accentLine,
    paddingBottom: 12,
    marginBottom: 14,
  },
  locLabel: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accent,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  locValue: {
    fontFamily: theme.fonts.display,
    color: theme.ink,
    fontSize: 18,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  locBtn: {
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  locBtnEmphasis: {
    backgroundColor: theme.ball,
    borderColor: theme.ballDark,
  },
  locBtnText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
  },
  locBtnTextEmphasis: {
    color: '#FFFFFF',
  },
  showPlacesBtn: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  showPlacesText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.accentDark,
  },
  locHelp: {
    marginTop: -4,
    marginBottom: 14,
  },
  locWarn: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.ballDark,
    lineHeight: 17,
    marginBottom: 8,
  },
  locHint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.muted,
    marginBottom: 8,
  },
  areaSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  areaInput: {
    flex: 1,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.ink,
  },
  areaSetBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 56,
    alignItems: 'center',
  },
  areaSetBtnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  areaSuggestList: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    marginBottom: 10,
    overflow: 'hidden',
  },
  areaSuggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  areaSuggestText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.ink,
  },
  areaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  areaChipOn: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  areaChipSoft: {
    borderColor: theme.border,
  },
  areaChipText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.ink,
  },
  areaChipTextOn: {
    color: theme.accentDark,
  },
  section: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    marginBottom: 12,
    marginTop: 4,
    color: theme.ink,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  sectionLink: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.accentDark,
    marginTop: 4,
  },
  sectionHint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.mutedSoft,
    marginBottom: 10,
    lineHeight: 17,
  },
  placeRowCard: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  placeRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  placeFree: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accentDark,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  popularBadge: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 10,
    color: theme.ballDark,
    backgroundColor: theme.ballSoft,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeDist: {
    fontFamily: theme.fonts.body,
    color: theme.mutedSoft,
    fontSize: 12,
    marginLeft: 'auto',
  },
  placeName: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    fontSize: 16,
    lineHeight: 21,
  },
  placeMarkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  placeSports: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.accentDark,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  placeRateRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  showMoreBtn: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderStyle: 'dashed',
    backgroundColor: theme.accentSoft,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  showMoreText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accentDark,
    fontSize: 14,
  },
  emptyInvite: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderLeftWidth: 4,
    borderLeftColor: theme.ball,
    borderRadius: theme.radius.md,
    padding: 18,
    marginBottom: 20,
  },
  loadError: {
    backgroundColor: theme.warnBg,
    borderWidth: 1,
    borderColor: theme.warnFg,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 20,
  },
  loadErrorTitle: {
    color: theme.ink,
    fontFamily: theme.fonts.displayBold,
    fontSize: 20,
    marginBottom: 4,
  },
  loadErrorBody: {
    color: theme.warnFg,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.warnFg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: {
    color: theme.warnFg,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
  },
  emptyInviteTitle: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 22,
    color: theme.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptyInviteBody: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyMarks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  emptyPoster: {
    width: '47%',
    maxWidth: 176,
  },
  emptyInviteBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.ballDark,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyInviteBtnText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
  emptyInviteGhost: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyInviteGhostText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 },
  sport: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ballDark,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    letterSpacing: -0.2,
  },
  meta: {
    color: theme.muted,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    marginBottom: 6,
  },
  recurring: {
    color: theme.accent,
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
    backgroundColor: theme.ball,
    paddingVertical: 11,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.ballDark,
  },
  joinText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    letterSpacing: 0.2,
  },
});
