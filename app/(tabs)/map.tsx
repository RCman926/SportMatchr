import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FREE_COURT_COUNT, OTTAWA_COURTS, OttawaCourt } from '../../constants/ottawaCourts';
import { SportFilterBar } from '../../components/SportPicker';
import { WEDGE, isWedgeNeighbourhood } from '../../constants/wedge';
import { currentOttawaSeason } from '../../constants/sports';
import { useLocationStore } from '../../lib/locationStore';
import { formatDistanceKm, haversineKm } from '../../lib/location';
import { listFreePlaces } from '../../lib/places';
import { theme } from '../../constants/theme';

type SeasonFilter = 'all' | 'winter' | 'summer' | 'year-round' | 'multi';
type TypeFilter = 'all' | 'free' | 'paid';
type CourtWithDistance = OttawaCourt & { distanceKm: number };

function seasonFilterDefault(): SeasonFilter {
  const s = currentOttawaSeason();
  if (s === 'Winter') return 'winter';
  if (s === 'Summer') return 'summer';
  return 'all';
}

function buildMapSrc(court: OttawaCourt | null) {
  const pad = 0.025;
  const focus = court ?? listFreePlaces()[0];
  if (!focus) {
    return 'https://www.openstreetmap.org/export/embed.html?bbox=-75.82%2C45.30%2C-75.50%2C45.50&layer=mapnik';
  }

  const west = focus.lng - pad;
  const south = focus.lat - pad;
  const east = focus.lng + pad;
  const north = focus.lat + pad;
  const bbox = `${west}%2C${south}%2C${east}%2C${north}`;
  const marker = `marker=${focus.lat}%2C${focus.lng}`;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&${marker}`;
}

function EmbeddedOttawaMap({ court }: { court: OttawaCourt | null }) {
  const src = buildMapSrc(court);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackTitle}>{court ? court.name : 'Ottawa free places'}</Text>
        <Text style={styles.mapFallbackSub}>
          {court
            ? `${court.neighbourhood} · ${court.lat.toFixed(4)}, ${court.lng.toFixed(4)}`
            : 'Pick a free place in the list below.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mapShell}>
      {/* iframe is web-only */}
      <iframe
        key={court?.id ?? 'ottawa'}
        title="Ottawa court map"
        src={src}
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </View>
  );
}

const SEASON_LABEL: Record<string, string> = {
  winter: 'Winter',
  summer: 'Summer',
  'year-round': 'Year-round',
  multi: 'Multi-season',
};

export default function MapScreen() {
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>(seasonFilterDefault);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('free');
  const [selectedId, setSelectedId] = useState<string | null>(WEDGE.priorityCourtIds[0] ?? null);
  const [copied, setCopied] = useState(false);

  const coords = useLocationStore((s) => s.coords);
  const area = useLocationStore((s) => s.area);
  const source = useLocationStore((s) => s.source);
  const refresh = useLocationStore((s) => s.refresh);

  const courts = useMemo(() => {
    const filtered = OTTAWA_COURTS.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (sportFilter && !c.sports.includes(sportFilter)) return false;
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
  }, [sportFilter, seasonFilter, typeFilter, coords]);

  useEffect(() => {
    if (!courts.find((c) => c.id === selectedId)) {
      setSelectedId(courts[0]?.id ?? null);
    }
  }, [courts, selectedId]);

  const selected = courts.find((c) => c.id === selectedId) ?? courts[0] ?? null;

  const jumpNearMe = async () => {
    await refresh();
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
    const text = `${selected.name}, ${selected.neighbourhood}, Ottawa (${selected.lat}, ${selected.lng})`;
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
      <Text style={styles.header}>Free places</Text>
      <Text style={styles.sub}>
        Near you · free first · {FREE_COURT_COUNT}+ public spots · any activity
      </Text>

      <View style={styles.locBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.locLabel}>
            {source === 'gps' ? 'You are near' : 'Default area'}
          </Text>
          <Text style={styles.locValue}>{area}</Text>
        </View>
        <TouchableOpacity style={styles.locBtn} onPress={jumpNearMe} activeOpacity={0.85}>
          <Text style={styles.locBtnText}>Near me</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rowFilters}>
        {([
          ['free', 'Free'],
          ['paid', 'Paid'],
          ['all', 'All'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.miniChip, typeFilter === key && styles.miniChipOn]}
            onPress={() => setTypeFilter(key)}
          >
            <Text style={[styles.miniChipText, typeFilter === key && styles.miniChipTextOn]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.rowFilters}>
        {([
          ['all', 'All seasons'],
          ['winter', 'Winter'],
          ['summer', 'Summer'],
          ['year-round', 'Year-round'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.miniChip, seasonFilter === key && styles.miniChipOn]}
            onPress={() => setSeasonFilter(key)}
          >
            <Text style={[styles.miniChipText, seasonFilter === key && styles.miniChipTextOn]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SportFilterBar selected={sportFilter} onChange={setSportFilter} />

      <EmbeddedOttawaMap court={selected} />

      {selected && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedLabel}>
            Selected · {formatDistanceKm(selected.distanceKm)} ·{' '}
            {selected.type === 'free' ? 'Free' : 'Paid'} · {SEASON_LABEL[selected.season]}
          </Text>
          <Text style={styles.selectedName}>{selected.name}</Text>
          <Text style={styles.selectedMeta}>{selected.neighbourhood}</Text>
          <Text style={styles.selectedSports}>{selected.sports.join(' · ')}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copyLocation} activeOpacity={0.85}>
            <Text style={styles.copyText}>
              {copied ? 'Copied!' : 'Copy location (stay in app)'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {courts.length === 0 && (
          <Text style={styles.empty}>No spots for this filter. Try Free + All seasons.</Text>
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
                    <View
                      style={[
                        styles.typeBadge,
                        c.type === 'paid' ? styles.typePaid : styles.typeFree,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          c.type === 'paid' ? styles.typeTextPaid : styles.typeTextFree,
                        ]}
                      >
                        {c.type === 'paid' ? 'Paid' : 'Free'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.hood}>
                    {c.neighbourhood} · {formatDistanceKm(c.distanceKm)}
                    {isWedgeNeighbourhood(c.neighbourhood) ? ' · wedge' : ''}
                  </Text>
                  <Text style={styles.sports}>{c.sports.join(' · ')}</Text>
                  {c.notes ? <Text style={styles.notes}>{c.notes}</Text> : null}
                  <Text style={styles.tapHint}>{on ? 'Showing on map' : 'Tap to show on map'}</Text>
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
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locBtnText: { color: theme.accentDark, fontWeight: '800', fontSize: 12 },
  rowFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  miniChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  miniChipOn: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  miniChipText: { color: theme.ink, fontWeight: '700', fontSize: 12 },
  miniChipTextOn: { color: '#FFFFFF' },
  mapShell: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: theme.border,
  },
  mapFallback: {
    height: 100,
    borderRadius: 16,
    backgroundColor: theme.bg,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  mapFallbackTitle: { color: theme.ink, fontWeight: '800', fontSize: 16 },
  mapFallbackSub: { color: theme.accent, marginTop: 4, fontSize: 13 },
  selectedCard: {
    backgroundColor: theme.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  selectedLabel: { color: theme.accent, fontSize: 11, fontWeight: '800' },
  selectedName: { color: theme.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  selectedMeta: { color: theme.accent, marginTop: 4, fontSize: 13 },
  selectedSports: { color: theme.ink, marginTop: 6, fontWeight: '600', fontSize: 13 },
  copyBtn: {
    marginTop: 10,
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  copyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: theme.accent },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  typeFree: { backgroundColor: theme.accentSoft },
  typePaid: { backgroundColor: theme.accentSoft },
  typeText: { fontSize: 11, fontWeight: '700' },
  typeTextFree: { color: theme.accentDark },
  typeTextPaid: { color: theme.accentBright },
  hood: { marginTop: 4, color: theme.muted, fontSize: 13 },
  sports: { marginTop: 8, color: theme.accent, fontWeight: '600', fontSize: 13 },
  notes: { marginTop: 6, color: theme.muted, fontSize: 13 },
  tapHint: { marginTop: 10, color: theme.muted, fontWeight: '700', fontSize: 12 },
});
