import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { SportPicker } from '../components/SportPicker';
import { WEDGE } from '../constants/wedge';
import { getSeasonalPopularSports } from '../constants/sports';
import { createSession } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { useLocationStore } from '../lib/locationStore';
import { haversineKm } from '../lib/location';
import { listFreePlaces } from '../lib/places';

export default function CreateSessionScreen() {
  const [sport, setSport] = useState<string | null>(getSeasonalPopularSports()[0] ?? 'Basketball');
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [recurring, setRecurring] = useState(true);
  const [recurringLabel, setRecurringLabel] = useState('Every Tue 7:00 PM');
  const [saving, setSaving] = useState(false);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const coords = useLocationStore((s) => s.coords);

  const matchingCourts = useMemo(() => {
    const freeFirst = listFreePlaces({ sport, seasonAware: true });
    const fallback = listFreePlaces({ sport });
    const pool = freeFirst.length ? freeFirst : fallback.length ? fallback : listFreePlaces();
    return [...pool].sort((a, b) => {
      const ap = (WEDGE.priorityCourtIds as readonly string[]).includes(a.id) ? 0 : 1;
      const bp = (WEDGE.priorityCourtIds as readonly string[]).includes(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (
        haversineKm(coords, { lat: a.lat, lng: a.lng }) -
        haversineKm(coords, { lat: b.lat, lng: b.lng })
      );
    });
  }, [sport, coords]);

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
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    if (!sport) {
      Alert.alert('Pick a sport', 'Choose what you want to play.');
      return;
    }
    setSaving(true);
    const sessionTitle = title.trim() || `${sport} pickup`;
    const result = await createSession({
      sport,
      title: sessionTitle,
      location: location || 'Ottawa',
      courtId,
      maxPlayers: Number(maxPlayers) || 8,
      recurring: recurring ? recurringLabel.trim() || 'Weekly' : undefined,
      description: recurring
        ? `Recurring host session in ${WEDGE.pocketName}. Free public place only.`
        : `Pickup in ${WEDGE.pocketName}. Free public place only.`,
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
        time: recurring ? recurringLabel : 'Today',
        players: '1',
        max: maxPlayers || '8',
        recurring: recurring ? recurringLabel : '',
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
        Free public places near you — any activity. Pick a sport, then a free spot.
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

      <Text style={styles.label}>Free place (near you first)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courtRow}
      >
        {matchingCourts.slice(0, 12).map((c) => {
          const on = location === c.name;
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
              <Text style={[styles.courtText, on && styles.courtTextOn]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Recurring weekly</Text>
          <Text style={styles.hint}>Recurring hosts beat one-offs for density</Text>
        </View>
        <Switch
          value={recurring}
          onValueChange={setRecurring}
          trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
          thumbColor={recurring ? '#0D9488' : '#FFFFFF'}
        />
      </View>

      {recurring ? (
        <>
          <Text style={styles.label}>When it repeats</Text>
          <TextInput
            style={styles.input}
            value={recurringLabel}
            onChangeText={setRecurringLabel}
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
  screen: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { padding: 16, paddingBottom: 40 },
  exitBar: {
    backgroundColor: '#F4F6F8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  exitText: { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  header: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  sub: { color: '#64748B', marginBottom: 20, marginTop: 4, lineHeight: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 4,
  },
  hint: { color: '#64748B', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  courtRow: { gap: 8, paddingBottom: 14 },
  courtChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: 200,
  },
  courtChipOn: { backgroundColor: '#CCFBF1', borderColor: '#0D9488' },
  courtText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  courtTextOn: { color: '#14B8A6' },
  createBtn: {
    marginTop: 12,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
