import { useMemo, useState } from 'react';
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
import { OTTAWA_COURTS } from '../constants/ottawaCourts';
import { WEDGE } from '../constants/wedge';
import { createSession } from '../lib/api';

export default function CreateSessionScreen() {
  const [sport, setSport] = useState<string | null>(WEDGE.primarySport);
  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [recurring, setRecurring] = useState(true);
  const [recurringLabel, setRecurringLabel] = useState('Every Tue 7:00 PM');
  const [saving, setSaving] = useState(false);

  const matchingCourts = useMemo(() => {
    const bySport = sport
      ? OTTAWA_COURTS.filter((c) => c.sports.includes(sport))
      : OTTAWA_COURTS;
    const priority = WEDGE.priorityCourtIds
      .map((id) => OTTAWA_COURTS.find((c) => c.id === id))
      .filter(Boolean) as typeof OTTAWA_COURTS;
    const rest = bySport.filter(
      (c) => !(WEDGE.priorityCourtIds as readonly string[]).includes(c.id)
    );
    const merged = [...priority.filter((c) => !sport || c.sports.includes(sport)), ...rest];
    return merged.length ? merged : OTTAWA_COURTS;
  }, [sport]);

  const [location, setLocation] = useState(matchingCourts[0]?.name ?? '');
  const [courtId, setCourtId] = useState(matchingCourts[0]?.id);

  const create = async () => {
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
        ? `Recurring host session in ${WEDGE.pocketName}. Public court only.`
        : `Pickup in ${WEDGE.pocketName}. Public court only.`,
    });
    setSaving(false);
    router.push({
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

      <Text style={styles.header}>Create pickup</Text>
      <Text style={styles.sub}>
        Host tools win density. Default: {WEDGE.primarySport} at {WEDGE.pocketName} courts.
      </Text>

      <SportPicker mode="single" label="Sport" selected={sport} onChange={setSport} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder={`${sport ?? 'Sport'} open play`}
        placeholderTextColor="#94A3B8"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Court / venue (wedge first)</Text>
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
