import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SportPicker } from '../components/SportPicker';
import { getSeasonalPopularSports } from '../constants/sports';
import { theme } from '../constants/theme';
import { createSession } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { useLocationStore } from '../lib/locationStore';
import { formatDistanceKm, haversineKm } from '../lib/location';
import { listFreePlaces } from '../lib/places';
import type { OttawaCourt } from '../constants/ottawaCourts';

type WhenMode = 'asap' | 'day' | 'weekly';
type AreaFilter =
  | 'near'
  | 'kanata'
  | 'britannia'
  | 'mooneys'
  | 'westboro'
  | 'centretown'
  | 'orleans'
  | 'all';

const AREA_CHIPS: { key: AreaFilter; label: string }[] = [
  { key: 'near', label: 'Near you' },
  { key: 'kanata', label: 'Kanata' },
  { key: 'britannia', label: 'Britannia' },
  { key: 'mooneys', label: "Mooney's Bay" },
  { key: 'westboro', label: 'Westboro' },
  { key: 'centretown', label: 'Glebe / Centre' },
  { key: 'orleans', label: 'Orléans' },
  { key: 'all', label: 'All Ottawa' },
];

const DAY_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekend', label: 'This weekend' },
] as const;

function matchesArea(c: OttawaCourt, area: AreaFilter): boolean {
  const n = `${c.neighbourhood} ${c.name}`.toLowerCase();
  switch (area) {
    case 'kanata':
      return n.includes('kanata') || n.includes('stittsville') || n.includes('katimavik');
    case 'britannia':
      return n.includes('britannia') || n.includes('bayshore') || n.includes('andrew haydon');
    case 'mooneys':
      return n.includes('mooney') || n.includes("hog's back") || n.includes('hogs back') || n.includes('riverside');
    case 'westboro':
      return n.includes('westboro') || n.includes('wellington west');
    case 'centretown':
      return (
        n.includes('glebe') ||
        n.includes('centretown') ||
        n.includes('lansdowne') ||
        n.includes('old ottawa south') ||
        n.includes('sandy hill') ||
        n.includes('downtown')
      );
    case 'orleans':
      return n.includes('orléans') || n.includes('orleans') || n.includes('millennium') || n.includes('ray friel');
    default:
      return true;
  }
}

function whenLabel(mode: WhenMode, day: string, weekly: string, timeNote: string): string {
  if (mode === 'asap') return timeNote.trim() || 'ASAP / today';
  if (mode === 'weekly') return weekly.trim() || 'Weekly';
  const dayLabel =
    day === 'tomorrow' ? 'Tomorrow' : day === 'weekend' ? 'This weekend' : 'Today';
  return timeNote.trim() ? `${dayLabel} · ${timeNote.trim()}` : dayLabel;
}

export default function CreateSessionScreen() {
  const [sport, setSport] = useState<string | null>(getSeasonalPopularSports()[0] ?? 'Basketball');
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [area, setArea] = useState<AreaFilter>('near');
  const [whenMode, setWhenMode] = useState<WhenMode>('asap');
  const [dayPreset, setDayPreset] = useState<(typeof DAY_PRESETS)[number]['key']>('today');
  const [timeNote, setTimeNote] = useState('After work');
  const [weeklyLabel, setWeeklyLabel] = useState('Every Tue 7:00 PM');
  const [saving, setSaving] = useState(false);
  const canAct = useAuthStore((s) => s.canAct);
  const coords = useLocationStore((s) => s.coords);

  const matchingCourts = useMemo(() => {
    const freeFirst = listFreePlaces({ sport, seasonAware: true });
    const fallback = listFreePlaces({ sport });
    const pool = freeFirst.length ? freeFirst : fallback.length ? fallback : listFreePlaces();

    const scoped =
      area === 'near' || area === 'all' ? pool : pool.filter((c) => matchesArea(c, area));

    const ranked = [...(scoped.length ? scoped : pool)].map((c) => ({
      ...c,
      distanceKm: haversineKm(coords, { lat: c.lat, lng: c.lng }),
    }));

    ranked.sort((a, b) => {
      if (area === 'near') {
        return a.distanceKm - b.distanceKm;
      }
      // Area browse: still prefer closer within that pocket
      return a.distanceKm - b.distanceKm;
    });

    // Diversify "near you" so we don't show 12 Sandy Hill clones
    if (area === 'near') {
      const seenHoods = new Set<string>();
      const diverse: typeof ranked = [];
      for (const c of ranked) {
        const hood = c.neighbourhood.toLowerCase();
        if (seenHoods.has(hood) && diverse.length >= 6) continue;
        if (!seenHoods.has(hood)) seenHoods.add(hood);
        diverse.push(c);
        if (diverse.length >= 18) break;
      }
      // Always pin known high-demand parks if they match the sport
      const pinIds = ['mooneys', 'britannia', 'kanata-lakes', 'kanata-recreation', 'katimavik-courts', 'lansdowne', 'brewer'];
      for (const id of pinIds) {
        const hit = ranked.find((c) => c.id === id);
        if (hit && !diverse.some((d) => d.id === id)) diverse.push(hit);
      }
      return diverse;
    }

    return ranked.slice(0, 24);
  }, [sport, coords, area]);

  const [location, setLocation] = useState(matchingCourts[0]?.name ?? '');
  const [courtId, setCourtId] = useState(matchingCourts[0]?.id);

  useEffect(() => {
    const next = matchingCourts[0];
    if (!next) return;
    if (!matchingCourts.some((c) => c.id === courtId)) {
      setLocation(next.name);
      setCourtId(next.id);
    }
  }, [matchingCourts, courtId]);

  const create = async () => {
    if (!canAct) {
      router.push('/auth');
      return;
    }
    if (!sport) {
      Alert.alert('Pick a sport', 'Choose what you want to play.');
      return;
    }
    const when = whenLabel(whenMode, dayPreset, weeklyLabel, timeNote);
    setSaving(true);
    const sessionTitle = title.trim() || `${sport} open play`;
    const result = await createSession({
      sport,
      title: sessionTitle,
      location: location || 'Ottawa',
      courtId,
      maxPlayers: Number(maxPlayers) || 8,
      recurring: whenMode === 'weekly' ? weeklyLabel.trim() || 'Weekly' : undefined,
      description:
        whenMode === 'weekly'
          ? `Recurring meetup · free public place · ${when}`
          : `Pickup · ${when} · free public place only.`,
    });
    setSaving(false);
    if (result.error || !result.id) {
      Alert.alert('Could not create', result.error ?? 'Sign in and try again.');
      return;
    }
    router.replace({
      pathname: '/session/[id]',
      params: {
        id: result.id,
        sport,
        title: sessionTitle,
        location: location || 'Ottawa',
        time: when,
        players: '1',
        max: maxPlayers || '8',
        recurring: whenMode === 'weekly' ? weeklyLabel : '',
      },
    });
  };

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.exitBar} onPress={goHome} activeOpacity={0.85}>
        <Text style={styles.exitText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Host a meetup</Text>
      <Text style={styles.sub}>
        Pick an activity, a free place across Ottawa, and when — ASAP, one day, or weekly.
      </Text>

      <SportPicker mode="single" label="Activity" selected={sport} onChange={setSport} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder={`${sport ?? 'Activity'} open play`}
        placeholderTextColor="#94A3B8"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Area</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.areaRow}
      >
        {AREA_CHIPS.map((chip) => {
          const on = area === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.areaChip, on && styles.areaChipOn]}
              onPress={() => setArea(chip.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.areaText, on && styles.areaTextOn]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>
        Free place{matchingCourts.length ? ` · ${matchingCourts.length}` : ''}
      </Text>
      {matchingCourts.length === 0 ? (
        <Text style={styles.emptyPlaces}>
          No free places tagged for {sport ?? 'this activity'} in that area. Try All Ottawa or another
          activity.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.courtRow}
        >
          {matchingCourts.map((c) => {
            const on = courtId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.courtChip, on && styles.courtChipOn]}
                onPress={() => {
                  setLocation(c.name);
                  setCourtId(c.id);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.courtText, on && styles.courtTextOn]} numberOfLines={2}>
                  {c.name}
                </Text>
                <Text style={[styles.courtMeta, on && styles.courtMetaOn]} numberOfLines={1}>
                  {formatDistanceKm(c.distanceKm)} · {c.neighbourhood}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Text style={styles.label}>When</Text>
      <View style={styles.whenRow}>
        {(
          [
            { key: 'asap' as const, label: 'ASAP' },
            { key: 'day' as const, label: 'Pick a day' },
            { key: 'weekly' as const, label: 'Weekly' },
          ] as const
        ).map((opt) => {
          const on = whenMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.whenChip, on && styles.whenChipOn]}
              onPress={() => setWhenMode(opt.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.whenText, on && styles.whenTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {whenMode === 'asap' ? (
        <>
          <Text style={styles.hint}>Starts as soon as people join — good for tonight.</Text>
          <Text style={styles.label}>Time note (optional)</Text>
          <TextInput
            style={styles.input}
            value={timeNote}
            onChangeText={setTimeNote}
            placeholder="e.g. After work · 6:30 PM"
            placeholderTextColor="#94A3B8"
          />
        </>
      ) : null}

      {whenMode === 'day' ? (
        <>
          <View style={styles.whenRow}>
            {DAY_PRESETS.map((d) => {
              const on = dayPreset === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.whenChip, on && styles.whenChipOn]}
                  onPress={() => setDayPreset(d.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.whenText, on && styles.whenTextOn]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            value={timeNote}
            onChangeText={setTimeNote}
            placeholder="e.g. 10:00 AM · after lunch"
            placeholderTextColor="#94A3B8"
          />
        </>
      ) : null}

      {whenMode === 'weekly' ? (
        <>
          <Text style={styles.hint}>Same slot every week — best for building a crew.</Text>
          <Text style={styles.label}>Repeats</Text>
          <TextInput
            style={styles.input}
            value={weeklyLabel}
            onChangeText={setWeeklyLabel}
            placeholder="Every Tue 7:00 PM"
            placeholderTextColor="#94A3B8"
          />
        </>
      ) : null}

      <Text style={styles.label}>Max players</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
      />

      <TouchableOpacity
        style={styles.createBtn}
        onPress={create}
        activeOpacity={0.85}
        disabled={saving}
      >
        <Text style={styles.createText}>
          {saving ? 'Creating…' : 'Create session + open chat'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 16, paddingBottom: 40 },
  exitBar: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exitText: { color: theme.ink, fontFamily: theme.fonts.bodyBold, fontSize: 14 },
  header: {
    fontSize: 28,
    fontFamily: theme.fonts.displayBold,
    color: theme.ink,
  },
  sub: {
    color: theme.muted,
    marginBottom: 20,
    marginTop: 4,
    lineHeight: 20,
    fontFamily: theme.fonts.body,
  },
  label: {
    fontSize: 13,
    fontFamily: theme.fonts.bodyBold,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  hint: {
    color: theme.muted,
    fontSize: 12,
    fontFamily: theme.fonts.body,
    marginBottom: 10,
    lineHeight: 17,
  },
  emptyPlaces: {
    color: theme.muted,
    fontFamily: theme.fonts.body,
    marginBottom: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    fontFamily: theme.fonts.body,
  },
  areaRow: { gap: 8, paddingBottom: 12 },
  areaChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  areaChipOn: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  areaText: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyMed,
    fontSize: 13,
  },
  areaTextOn: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
  },
  courtRow: { gap: 8, paddingBottom: 14 },
  courtChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    width: 180,
  },
  courtChipOn: {
    backgroundColor: theme.ballSoft,
    borderColor: theme.ball,
  },
  courtText: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyMed,
    fontSize: 13,
    minHeight: 34,
  },
  courtTextOn: {
    color: theme.ballDark,
    fontFamily: theme.fonts.bodyBold,
  },
  courtMeta: {
    marginTop: 4,
    color: theme.muted,
    fontSize: 11,
    fontFamily: theme.fonts.body,
  },
  courtMetaOn: { color: theme.ballDark },
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  whenChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  whenChipOn: {
    backgroundColor: theme.ballSoft,
    borderColor: theme.ball,
  },
  whenText: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyMed,
    fontSize: 14,
  },
  whenTextOn: {
    color: theme.ballDark,
    fontFamily: theme.fonts.bodyBold,
  },
  createBtn: {
    marginTop: 12,
    backgroundColor: theme.ball,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
});
