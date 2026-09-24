import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { OttawaCourt } from '../../constants/ottawaCourts';
import { SportFilterBar, type BrowseSeason } from '../../components/SportPicker';
import { WEDGE, isWedgeNeighbourhood } from '../../constants/wedge';
import { currentOttawaSeason } from '../../constants/sports';
import { useLocationStore } from '../../lib/locationStore';
import { AREA_PRESETS, formatDistanceKm, haversineKm, nearYouStatus } from '../../lib/location';
import { theme, cardShadow } from '../../constants/theme';
import { sportPinColor } from '../../lib/sportPinColor';
import { PageHero, SportScene, SportSceneStrip } from '../../components/SportScene';
import { PlacesMap } from '../../components/PlacesMap';
import { PressScale, FadeUp } from '../../components/motion';
import { router } from 'expo-router';
import { useAuthStore } from '../../lib/authStore';
import { catalogSportForHost, isMapPlaceSport, listMapPlaces, mapSportsOnly } from '../../lib/places';

type SeasonFilter = 'all' | 'winter' | 'summer' | 'year-round' | 'multi';
type CourtWithDistance = OttawaCourt & { distanceKm: number };

function SportChips({
  sports,
  active,
  onPick,
}: {
  sports: string[];
  active?: string | null;
  onPick?: (sport: string | null) => void;
}) {
  const shown = mapSportsOnly(sports);
  if (shown.length === 0) return null;
  return (
    <View style={styles.sportChips}>
      {shown.map((s) => {
        const on = active === s;
        const inner = (
          <>
            <View style={[styles.sportDot, { backgroundColor: sportPinColor(s) }]} />
            <Text style={styles.sportChipText}>{s}</Text>
          </>
        );
        if (!onPick) {
          return (
            <View key={s} style={styles.sportChip}>
              {inner}
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={s}
            style={[styles.sportChip, on && styles.sportChipOn]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={on ? `Clear ${s} filter` : `Show ${s} places`}
            onPress={() => onPick(on ? null : s)}
          >
            {inner}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function seasonFilterDefault(): SeasonFilter {
  const s = currentOttawaSeason();
  if (s === 'Winter') return 'winter';
  if (s === 'Summer') return 'summer';
  return 'all';
}

const SEASON_LABEL: Record<string, string> = {
  winter: 'Winter',
  summer: 'Summer',
  'year-round': 'Year-round',
  multi: 'Multi-season',
};

function browseToSeason(browse: BrowseSeason): SeasonFilter {
  if (browse === 'Winter') return 'winter';
  if (browse === 'Summer') return 'summer';
  if (browse === 'Year-round') return 'year-round';
  return 'all';
}

export default function MapScreen() {
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>(seasonFilterDefault);
  const [selectedId, setSelectedId] = useState<string | null>(WEDGE.priorityCourtIds[0] ?? null);
  const [copied, setCopied] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const coords = useLocationStore((s) => s.coords);
  const area = useLocationStore((s) => s.area);
  const source = useLocationStore((s) => s.source);
  const refresh = useLocationStore((s) => s.refresh);
  const setManualArea = useLocationStore((s) => s.setManualArea);
  const errorHint = useLocationStore((s) => s.errorHint);
  const locLoading = useLocationStore((s) => s.loading);
  const near = nearYouStatus(source, area);
  const locationUnset = source === 'fallback';

  useEffect(() => {
    if (!locLoading && locationUnset) setAreaOpen(true);
  }, [locLoading, locationUnset]);
  const canAct = useAuthStore((s) => s.canAct);

  const courts = useMemo(() => {
    const filtered = listMapPlaces({
      sport: isMapPlaceSport(sportFilter) ? sportFilter : null,
    }).filter((c) => {
      if (seasonFilter === 'all') return true;
      if (seasonFilter === 'multi') return c.season === 'multi';
      return c.season === seasonFilter || c.season === 'multi' || c.season === 'year-round';
    });
    return filtered
      .map((c) => ({
        ...c,
        distanceKm: haversineKm(coords, { lat: c.lat, lng: c.lng }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm) as CourtWithDistance[];
  }, [sportFilter, seasonFilter, coords]);

  useEffect(() => {
    if (sportFilter && !isMapPlaceSport(sportFilter)) setSportFilter(null);
  }, [sportFilter]);

  useEffect(() => {
    if (!courts.find((c) => c.id === selectedId)) {
      setSelectedId(courts[0]?.id ?? null);
    }
  }, [courts, selectedId]);

  const selected = courts.find((c) => c.id === selectedId) ?? courts[0] ?? null;

  const jumpNearMe = async () => {
    await refresh({ forcePrompt: true });
    const c = useLocationStore.getState().coords;
    const nearest = [...courts].sort(
      (a, b) =>
        haversineKm(c, { lat: a.lat, lng: a.lng }) -
        haversineKm(c, { lat: b.lat, lng: b.lng })
    )[0];
    if (nearest) setSelectedId(nearest.id);
  };

  const grouped = useMemo(() => {
    const order: OttawaCourt['season'][] = ['winter', 'summer', 'year-round', 'multi'];
    return order
      .map((season) => ({
        season,
        items: courts.filter((c) => c.season === season),
      }))
      .filter((g) => g.items.length > 0);
  }, [courts]);

  const copyLocation = async () => {
    if (!selected) return;
    const text = [
      selected.name,
      selected.address,
      selected.neighbourhood,
      'Ottawa',
    ]
      .filter(Boolean)
      .join(', ');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHero
        sport={sportFilter}
        title="Places"
        caption={sportFilter ? `${sportFilter} spots` : 'Courts, fields, rinks, outdoor gyms'}
      />
      <Text style={styles.sub}>
        Outdoor courts, fields, rinks, beaches, disc golf, and fitness stations. Host spikeball or yoga at these same parks — they just don’t get their own pin.
      </Text>

      <View style={styles.locBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.locLabel}>{near.label}</Text>
          <Text style={styles.locValue}>{near.value}</Text>
        </View>
        <TouchableOpacity
          style={[styles.locBtn, locationUnset && styles.locBtnEmphasis]}
          onPress={() => setAreaOpen((v) => !v)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={areaOpen ? 'Hide neighbourhood picker' : locationUnset ? 'Pick neighbourhood' : 'Change area'}
        >
          <Text style={[styles.locBtnText, locationUnset && styles.locBtnTextEmphasis]}>
            {areaOpen ? 'Hide' : locationUnset ? 'Pick neighbourhood' : 'Change area'}
          </Text>
        </TouchableOpacity>
      </View>
      {locationUnset && near.detail ? <Text style={styles.locUnset}>{near.detail}</Text> : null}
      {areaOpen ? (
        <View style={styles.areaBox}>
          {errorHint ? <Text style={styles.locUnset}>{errorHint}</Text> : null}
          <TouchableOpacity style={styles.locBtn} onPress={() => void jumpNearMe()} activeOpacity={0.85}>
            <Text style={styles.locBtnText}>{locLoading ? 'Locating…' : 'Use my location'}</Text>
          </TouchableOpacity>
          <View style={styles.areaChips}>
            {AREA_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.areaChip, source === 'manual' && area === p.label && styles.areaChipOn]}
                onPress={() => setManualArea(p.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.areaChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <SportFilterBar
        variant="map"
        selected={sportFilter}
        onChange={setSportFilter}
        onBrowseChange={(b) => setSeasonFilter(browseToSeason(b))}
      />

      <PlacesMap
        places={courts.map((c) => {
          const sports = mapSportsOnly(c.sports);
          const ordered =
            sportFilter && sports.some((s) => s === sportFilter)
              ? [sportFilter, ...sports.filter((s) => s !== sportFilter)]
              : [...sports];
          return { ...c, sports: ordered };
        })}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />

      {selected && (
        <FadeUp delay={80}>
        <View style={[styles.selectedCard, cardShadow]}>
          <SportScene sport={sportFilter ?? mapSportsOnly(selected.sports)[0]} height={188} />
          <View style={styles.selectedBody}>
          <Text style={styles.selectedLabel}>
            Selected · {formatDistanceKm(selected.distanceKm)} · Free ·{' '}
            {SEASON_LABEL[selected.season]}
          </Text>
          <Text style={styles.selectedName}>{selected.name}</Text>
          {selected.address ? (
            <>
              <Text style={styles.addrKicker}>Meet at</Text>
              <Text style={styles.selectedAddr}>{selected.address}</Text>
            </>
          ) : null}
          <Text style={styles.selectedHood}>{selected.neighbourhood}</Text>
          <SportChips
            sports={selected.sports}
            active={sportFilter}
            onPick={setSportFilter}
          />
          <PressScale
            style={styles.hostHereBtn}
            accessibilityLabel={canAct ? 'Host tonight here' : 'Sign up to host here'}
            onPress={() =>
              router.push({
                pathname: '/create',
                params: {
                  courtId: selected.id,
                  sport: catalogSportForHost(selected.sports, sportFilter),
                  when: 'tonight',
                },
              })
            }
          >
            <Text style={styles.hostHereText}>
              {canAct ? 'Host tonight here' : 'Sign up to host here'}
            </Text>
          </PressScale>
          <TouchableOpacity style={styles.copyBtn} onPress={copyLocation} activeOpacity={0.85}>
            <Text style={styles.copyText}>
              {copied ? 'Copied' : 'Copy address'}
            </Text>
          </TouchableOpacity>
          </View>
        </View>
        </FadeUp>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {courts.length === 0 && (
          <Text style={styles.empty}>No spots for this filter. Try All seasons.</Text>
        )}
        {grouped.map((group) => (
          <View key={group.season}>
            <Text style={styles.section}>{SEASON_LABEL[group.season]}</Text>
            {group.items.map((c) => {
              const on = selected?.id === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.card, on && styles.cardSelected]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedId(c.id)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.name}>{c.name}</Text>
                    <View style={[styles.typeBadge, styles.typeFree]}>
                      <Text style={[styles.typeText, styles.typeTextFree]}>Free</Text>
                    </View>
                  </View>
                  <Text style={styles.hood}>
                    {c.neighbourhood} · {formatDistanceKm(c.distanceKm)}
                    {isWedgeNeighbourhood(c.neighbourhood) ? ' · wedge' : ''}
                  </Text>
                  {c.address ? <Text style={styles.cardAddr}>Meet at {c.address}</Text> : null}
                  <SportSceneStrip sports={mapSportsOnly(c.sports)} height={168} />
                  <SportChips
                    sports={c.sports}
                    active={sportFilter}
                    onPick={setSportFilter}
                  />
                  {c.notes ? <Text style={styles.notes}>{c.notes}</Text> : null}
                  {on ? (
                    <PressScale
                      style={styles.hostHereBtn}
                      accessibilityLabel={canAct ? 'Host tonight here' : 'Sign up to host here'}
                      onPress={() =>
                        router.push({
                          pathname: '/create',
                          params: {
                            courtId: c.id,
                            sport: catalogSportForHost(c.sports, sportFilter),
                            when: 'tonight',
                          },
                        })
                      }
                    >
                      <Text style={styles.hostHereText}>
                        {canAct ? 'Host tonight here' : 'Sign up to host here'}
                      </Text>
                    </PressScale>
                  ) : (
                    <Text style={styles.tapHint}>Tap to show on map</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  header: { fontSize: 28, fontWeight: '800', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted, marginBottom: 10, lineHeight: 20 },
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 10,
  },
  locLabel: { color: theme.accent, fontWeight: '800', fontSize: 11 },
  locValue: { color: theme.ink, fontWeight: '600', fontSize: 13, marginTop: 2 },
  locBtn: {
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.accent,
    minHeight: 44,
    justifyContent: 'center',
  },
  locBtnEmphasis: {
    backgroundColor: theme.ball,
    borderColor: theme.ballDark,
  },
  locBtnText: { color: theme.accentDark, fontWeight: '800', fontSize: 14 },
  locBtnTextEmphasis: { color: '#FFFFFF' },
  locUnset: {
    color: theme.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
    marginBottom: 10,
  },
  areaBox: { marginBottom: 12, gap: 8 },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  areaChipOn: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  areaChipText: { color: theme.ink, fontWeight: '800', fontSize: 13 },
  selectedCard: {
    backgroundColor: theme.accentSoft,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  selectedBody: { padding: 14 },
  selectedLabel: { color: theme.accent, fontSize: 11, fontWeight: '800' },
  selectedName: { color: theme.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  addrKicker: {
    marginTop: 8,
    color: theme.mutedSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  selectedAddr: { color: theme.ink, marginTop: 1, fontSize: 15, lineHeight: 20 },
  selectedHood: { color: theme.muted, marginTop: 2, fontSize: 13 },
  sportChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sportChipOn: {
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,
  },
  sportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sportChipText: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.ink,
  },
  copyBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  copyText: {
    color: theme.muted,
    fontFamily: theme.fonts.bodyMed,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  hostHereBtn: {
    marginTop: 12,
    backgroundColor: theme.ball,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.ballDark,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hostHereText: {
    color: theme.surfaceRaised,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
  },
  list: { flex: 1 },
  section: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.ink,
    marginBottom: 8,
    marginTop: 4,
  },
  empty: { color: theme.muted, marginBottom: 12, lineHeight: 20 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: theme.ball },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  typeFree: { backgroundColor: theme.freeBg },
  typePaid: { backgroundColor: theme.paidBg },
  typeText: { fontSize: 11, fontWeight: '700' },
  typeTextFree: { color: theme.freeFg },
  typeTextPaid: { color: theme.paidFg },
  hood: { marginTop: 4, color: theme.muted, fontSize: 13 },
  cardAddr: { marginTop: 2, color: theme.muted, fontSize: 13, lineHeight: 18 },
  markRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sports: { marginTop: 8, color: theme.accent, fontWeight: '600', fontSize: 13 },
  notes: { marginTop: 6, color: theme.muted, fontSize: 13 },
  tapHint: { marginTop: 10, color: theme.muted, fontWeight: '700', fontSize: 12 },
});
