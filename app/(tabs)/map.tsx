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

type SeasonFilter = 'all' | 'winter' | 'summer' | 'year-round' | 'multi';
type TypeFilter = 'all' | 'free' | 'paid';

function buildMapSrc(court: OttawaCourt | null) {
  const pad = 0.025;
  const focus = court ?? OTTAWA_COURTS[0];
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
        <Text style={styles.mapFallbackTitle}>{court ? court.name : 'Ottawa courts'}</Text>
        <Text style={styles.mapFallbackSub}>
          {court
            ? `${court.neighbourhood} · ${court.lat.toFixed(4)}, ${court.lng.toFixed(4)}`
            : 'Pick a court in the list below.'}
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
  const [sportFilter, setSportFilter] = useState<string | null>(WEDGE.primarySport);
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('free');
  const [selectedId, setSelectedId] = useState<string | null>(WEDGE.priorityCourtIds[0] ?? null);
  const [copied, setCopied] = useState(false);

  const courts = useMemo(() => {
    const filtered = OTTAWA_COURTS.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (sportFilter && !c.sports.includes(sportFilter)) return false;
      if (seasonFilter === 'all') return true;
      if (seasonFilter === 'multi') return c.season === 'multi';
      return c.season === seasonFilter || c.season === 'multi';
    });
    return [...filtered].sort((a, b) => {
      const ap = WEDGE.priorityCourtIds.includes(a.id as (typeof WEDGE.priorityCourtIds)[number]) ? 0 : 1;
      const bp = WEDGE.priorityCourtIds.includes(b.id as (typeof WEDGE.priorityCourtIds)[number]) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const aw = isWedgeNeighbourhood(a.neighbourhood) ? 0 : 1;
      const bw = isWedgeNeighbourhood(b.neighbourhood) ? 0 : 1;
      return aw - bw;
    });
  }, [sportFilter, seasonFilter, typeFilter]);

  useEffect(() => {
    if (!courts.find((c) => c.id === selectedId)) {
      setSelectedId(courts[0]?.id ?? null);
    }
  }, [courts, selectedId]);

  const selected = courts.find((c) => c.id === selectedId) ?? courts[0] ?? null;

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
      <Text style={styles.header}>Courts</Text>
      <Text style={styles.sub}>
        {WEDGE.pocketName} first · {WEDGE.primarySport} · {FREE_COURT_COUNT}+ free Ottawa spots
      </Text>

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
            Selected · {selected.type === 'free' ? 'Free' : 'Paid'} ·{' '}
            {SEASON_LABEL[selected.season]}
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
                  <Text style={styles.hood}>{c.neighbourhood}</Text>
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
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 16 },
  header: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 14, color: '#64748B', marginBottom: 10, lineHeight: 20 },
  rowFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  miniChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  miniChipOn: { backgroundColor: '#CCFBF1', borderColor: '#0D9488' },
  miniChipText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  miniChipTextOn: { color: '#FFFFFF' },
  mapShell: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#E2E8F0',
  },
  mapFallback: {
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F4F6F8',
    padding: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  mapFallbackTitle: { color: '#0F172A', fontWeight: '800', fontSize: 16 },
  mapFallbackSub: { color: '#0D9488', marginTop: 4, fontSize: 13 },
  selectedCard: {
    backgroundColor: '#F4F6F8',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  selectedLabel: { color: '#0D9488', fontSize: 11, fontWeight: '800' },
  selectedName: { color: '#0F172A', fontSize: 18, fontWeight: '800', marginTop: 4 },
  selectedMeta: { color: '#0D9488', marginTop: 4, fontSize: 13 },
  selectedSports: { color: '#0F172A', marginTop: 6, fontWeight: '600', fontSize: 13 },
  copyBtn: {
    marginTop: 10,
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  copyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  list: { flex: 1 },
  section: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
  },
  empty: { color: '#64748B', marginBottom: 12, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: '#0D9488' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  typeFree: { backgroundColor: '#CCFBF1' },
  typePaid: { backgroundColor: '#CCFBF1' },
  typeText: { fontSize: 11, fontWeight: '700' },
  typeTextFree: { color: '#0F766E' },
  typeTextPaid: { color: '#14B8A6' },
  hood: { marginTop: 4, color: '#64748B', fontSize: 13 },
  sports: { marginTop: 8, color: '#0D9488', fontWeight: '600', fontSize: 13 },
  notes: { marginTop: 6, color: '#64748B', fontSize: 13 },
  tapHint: { marginTop: 10, color: '#64748B', fontWeight: '700', fontSize: 12 },
});
