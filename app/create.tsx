import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SportPicker } from '../components/SportPicker';
import { PageHero } from '../components/SportScene';
import { SessionAudienceFields } from '../components/SessionAudienceFields';
import { DateField, TimeField } from '../components/DateTimeFields';
import { getSeasonalPopularSports } from '../constants/sports';
import { theme } from '../constants/theme';
import { createSession, suggestPlace } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { useLocationStore } from '../lib/locationStore';
import { formatDistanceKm, haversineKm } from '../lib/location';
import { listFreePlaces, listHostPlaces } from '../lib/places';
import type { OttawaCourt } from '../constants/ottawaCourts';
import {
  combineLocalDateTime,
  formatWhenLabel,
  localYmd,
  nextWeekendYmd,
  shiftYmd,
  type AgeGroup,
  type PlayMix,
  type SkillLevel,
} from '../lib/sessionFilters';
import { goToAuth } from '../lib/pendingAuth';
import { shareSession } from '../lib/share';

type WhenMode = 'date' | 'asap' | 'day' | 'weekly';
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

function whenLabel(
  mode: WhenMode,
  day: string,
  weekly: string,
  timeNote: string,
  gameDate: string,
  gameTime: string
): string {
  if (mode === 'date') return formatWhenLabel(gameDate, gameTime);
  if (mode === 'asap') return timeNote.trim() || 'ASAP / today';
  if (mode === 'weekly') return weekly.trim() || 'Weekly';
  const dayLabel =
    day === 'tomorrow' ? 'Tomorrow' : day === 'weekend' ? 'This weekend' : 'Today';
  return timeNote.trim() ? `${dayLabel} · ${timeNote.trim()}` : dayLabel;
}

function computeStartsAt(
  mode: WhenMode,
  gameDate: string,
  gameTime: string,
  dayPreset: string
): string {
  if (mode === 'asap') return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  if (mode === 'day') {
    const ymd =
      dayPreset === 'tomorrow'
        ? shiftYmd(localYmd(), 1)
        : dayPreset === 'weekend'
          ? nextWeekendYmd()
          : localYmd();
    const hm = /^\d{1,2}:\d{2}/.test(gameTime) ? gameTime : '18:00';
    return combineLocalDateTime(ymd, hm).toISOString();
  }
  return combineLocalDateTime(gameDate || localYmd(), gameTime || '18:00').toISOString();
}

export default function CreateSessionScreen() {
  const params = useLocalSearchParams<{ courtId?: string; sport?: string; when?: string }>();
  const startWhen = typeof params.when === 'string' ? params.when : 'tonight';
  const [sport, setSport] = useState<string | null>(
    (typeof params.sport === 'string' && params.sport) || getSeasonalPopularSports()[0] || 'Basketball'
  );
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [area, setArea] = useState<AreaFilter>('near');
  const [whenMode, setWhenMode] = useState<WhenMode>(
    startWhen === 'asap' ? 'asap' : startWhen === 'weekly' ? 'weekly' : startWhen === 'date' ? 'date' : 'day'
  );
  const [dayPreset, setDayPreset] = useState<(typeof DAY_PRESETS)[number]['key']>('today');
  const [gameDate, setGameDate] = useState(localYmd());
  const [gameTime, setGameTime] = useState('18:00');
  const [timeNote, setTimeNote] = useState('After work · 6:00 PM');
  const [weeklyLabel, setWeeklyLabel] = useState('Every Tue 7:00 PM');
  const [notes, setNotes] = useState('');
  const [playMix, setPlayMix] = useState<PlayMix>('mixed');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('any');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('any');
  const [saving, setSaving] = useState(false);
  const [customPlace, setCustomPlace] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customHood, setCustomHood] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const canAct = useAuthStore((s) => s.canAct);
  const coords = useLocationStore((s) => s.coords);

  const matchingCourts = useMemo(() => {
    const freeFirst = listHostPlaces({ sport, seasonAware: true });
    const fallback = listHostPlaces({ sport });
    const pool = freeFirst.length ? freeFirst : fallback.length ? fallback : listHostPlaces();

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
      const pinIds = ['mooneys', 'britannia', 'walter-baker', 'kanata-lakes', 'kanata-recreation', 'katimavik-courts', 'lansdowne', 'brewer'];
      for (const id of pinIds) {
        const hit = ranked.find((c) => c.id === id);
        if (hit && !diverse.some((d) => d.id === id)) diverse.push(hit);
      }
      return diverse;
    }

    return ranked.slice(0, 24);
  }, [sport, coords, area]);

  const [location, setLocation] = useState(matchingCourts[0]?.name ?? '');
  const [courtId, setCourtId] = useState<string | undefined>(
    (typeof params.courtId === 'string' && params.courtId) || matchingCourts[0]?.id
  );

  useEffect(() => {
    const id = typeof params.courtId === 'string' ? params.courtId : '';
    if (!id) return;
    const hit = listFreePlaces().find((c) => c.id === id);
    if (!hit) return;
    setCourtId(hit.id);
    setLocation(hit.name);
    setCustomPlace(false);
  }, [params.courtId]);

  useEffect(() => {
    if (customPlace) return;
    const next = matchingCourts[0];
    if (!next) return;
    if (!matchingCourts.some((c) => c.id === courtId)) {
      const pinnedId = typeof params.courtId === 'string' ? params.courtId : '';
      if (pinnedId && courtId === pinnedId) return;
      setLocation(next.name);
      setCourtId(next.id);
    }
  }, [matchingCourts, courtId, customPlace]);

  const create = async () => {
    if (!canAct) {
      goToAuth({
        kind: 'create',
        courtId: customPlace ? undefined : courtId,
        sport: sport ?? undefined,
        when:
          whenMode === 'asap'
            ? 'asap'
            : whenMode === 'weekly'
              ? 'weekly'
              : whenMode === 'date'
                ? 'date'
                : 'tonight',
      });
      return;
    }
    if (!sport) {
      Alert.alert('Pick a sport', 'Choose what you want to play.');
      return;
    }
    if (customPlace && !customName.trim()) {
      Alert.alert('Name the place', 'Add the park / court name so people can find it.');
      return;
    }
    const when = whenLabel(whenMode, dayPreset, weeklyLabel, timeNote, gameDate, gameTime);
    const placeLabel = customPlace
      ? [customName.trim(), customHood.trim()].filter(Boolean).join(' · ')
      : location || 'Ottawa';
    const description = [notes.trim(), customPlace ? customNotes.trim() : '']
      .filter(Boolean)
      .join('\n');

    setSaving(true);
    if (customPlace) {
      await suggestPlace({
        name: customName.trim(),
        neighbourhood: customHood.trim() || undefined,
        notes: customNotes.trim() || 'Suggested while hosting a meetup',
        sport,
      });
    }
    const sessionTitle =
      title.trim() ||
      (whenMode === 'day' && dayPreset === 'today'
        ? `${sport} tonight · ${placeLabel}`
        : `${sport} · ${placeLabel}`);
    const result = await createSession({
      sport,
      title: sessionTitle,
      location: placeLabel,
      courtId: customPlace ? undefined : courtId,
      maxPlayers: Number(maxPlayers) || 8,
      startsAt: computeStartsAt(whenMode, gameDate, gameTime, dayPreset),
      recurring: whenMode === 'weekly' ? weeklyLabel.trim() || 'Weekly' : undefined,
      description,
      playMix,
      ageGroup,
      skillLevel,
    });
    setSaving(false);
    if (result.error || !result.id) {
      Alert.alert('Could not create', result.error ?? 'Sign in and try again.');
      return;
    }
    try {
      const { ensureNotifyPermission } = await import('../lib/notify');
      await ensureNotifyPermission({ force: true });
    } catch {
      /* ignore */
    }
    if (Platform.OS === 'web') {
      try {
        await shareSession({
          id: result.id,
          sport,
          title: sessionTitle,
          location: placeLabel,
          time: when,
        });
      } catch {
        /* share is optional */
      }
    }
    router.replace({
      pathname: '/session/[id]',
      params: {
        id: result.id,
        sport,
        title: sessionTitle,
        location: placeLabel,
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
    <View style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.exitBar} onPress={goHome} activeOpacity={0.85}>
        <Text style={styles.exitText}>← Back</Text>
      </TouchableOpacity>

      <PageHero sport={sport} caption={sport ? `Host ${sport}` : 'Host a game'} />
      <Text style={styles.header}>Host a game</Text>
      <Text style={styles.sub}>
        Tonight at a free place. Title is optional — we’ll name it for you.
      </Text>
      {!customPlace && location ? (
        <Text style={styles.placeLock}>Meet at {location}</Text>
      ) : null}

      <SportPicker mode="single" label="Activity" selected={sport} onChange={setSport} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder={`${sport ?? 'Activity'} tonight`}
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
        Place{!customPlace && matchingCourts.length ? ` · ${matchingCourts.length} free` : ''}
      </Text>
      <Text style={styles.hint}>
        Public free spots first. Paid courts / ranges are DIY — you book them, then use Somewhere
        else and say so in the notes. We don’t partner venues yet.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courtRow}
      >
        <TouchableOpacity
          style={[styles.courtChip, customPlace && styles.courtChipOn]}
          onPress={() => {
            setCustomPlace(true);
            setCourtId(undefined);
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.courtText, customPlace && styles.courtTextOn]}>
            Somewhere else
          </Text>
          <Text style={[styles.courtMeta, customPlace && styles.courtMetaOn]}>
            Free park or DIY booked court
          </Text>
        </TouchableOpacity>
        {matchingCourts.map((c) => {
          const on = !customPlace && courtId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.courtChip, on && styles.courtChipOn]}
              onPress={() => {
                setCustomPlace(false);
                setLocation(c.name);
                setCourtId(c.id);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.courtText, on && styles.courtTextOn]} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={[styles.courtMeta, on && styles.courtMetaOn]} numberOfLines={1}>
                {formatDistanceKm(c.distanceKm)} · {c.address || c.neighbourhood}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {customPlace ? (
        <>
          <Text style={styles.label}>Place name</Text>
          <TextInput
            style={styles.input}
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Katimavik Park · or Sportsplex court 3"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.label}>Neighbourhood / area</Text>
          <TextInput
            style={styles.input}
            value={customHood}
            onChangeText={setCustomHood}
            placeholder="e.g. Kanata"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.input}
            value={customNotes}
            onChangeText={setCustomNotes}
            placeholder="Free public · or I booked ice / court myself"
            placeholderTextColor="#94A3B8"
          />
        </>
      ) : null}

      {!customPlace && matchingCourts.length === 0 ? (
        <Text style={styles.emptyPlaces}>
          Nothing tagged here for {sport ?? 'this activity'} — use Somewhere else or try All Ottawa.
        </Text>
      ) : null}

      <Text style={styles.label}>When</Text>
      <View style={styles.whenRow}>
        {(
          [
            { key: 'day' as const, label: 'Today / weekend' },
            { key: 'asap' as const, label: 'ASAP' },
            { key: 'weekly' as const, label: 'Weekly' },
            { key: 'date' as const, label: 'Calendar' },
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

      {whenMode === 'date' ? (
        <>
          <Text style={styles.label}>Date</Text>
          <DateField value={gameDate} onChange={setGameDate} />
          <Text style={styles.label}>Time</Text>
          <TimeField value={gameTime} onChange={setGameTime} />
        </>
      ) : null}

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
          <View style={styles.whenRow}>
            {(
              [
                { hm: '17:00', note: '5:00 PM' },
                { hm: '18:00', note: 'After work · 6:00 PM' },
                { hm: '19:00', note: '7:00 PM' },
                { hm: '10:00', note: '10:00 AM' },
              ] as const
            ).map((t) => {
              const on = gameTime === t.hm;
              return (
                <TouchableOpacity
                  key={t.hm}
                  style={[styles.whenChip, on && styles.whenChipOn]}
                  onPress={() => {
                    setGameTime(t.hm);
                    setTimeNote(t.note);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.whenText, on && styles.whenTextOn]}>{t.note}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {whenMode === 'weekly' ? (
        <>
          <Text style={styles.hint}>Same slot every week — best for building a crew.</Text>
          <Text style={styles.label}>First date</Text>
          <DateField value={gameDate} onChange={setGameDate} />
          <Text style={styles.label}>Time</Text>
          <TimeField value={gameTime} onChange={setGameTime} />
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

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Bring a ball · after work vibe · extra parking note"
        placeholderTextColor="#94A3B8"
        multiline
      />

      <SessionAudienceFields
        playMix={playMix}
        ageGroup={ageGroup}
        skillLevel={skillLevel}
        onPlayMix={setPlayMix}
        onAgeGroup={setAgeGroup}
        onSkillLevel={setSkillLevel}
      />
      <View style={{ height: 24 }} />
    </ScrollView>
    <View style={styles.stickyBar}>
      <TouchableOpacity
        style={styles.createBtn}
        onPress={create}
        activeOpacity={0.85}
        disabled={saving}
      >
        <Text style={styles.createText}>
          {saving ? 'Posting…' : 'Post it — open the chat'}
        </Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 24 },
  stickyBar: {
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surfaceRaised,
  },
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
    marginBottom: 8,
    marginTop: 4,
    lineHeight: 20,
    fontFamily: theme.fonts.body,
  },
  placeLock: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    marginBottom: 16,
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
  notes: { minHeight: 72, textAlignVertical: 'top' },
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
