import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SportPicker } from '../../../components/SportPicker';
import { ProfileAvatar } from '../../../components/ProfileAvatar';
import { SessionAudienceFields } from '../../../components/SessionAudienceFields';
import { DateField, TimeField } from '../../../components/DateTimeFields';
import { theme } from '../../../constants/theme';
import {
  getSessionById,
  listSessionMembers,
  removeSessionMember,
  transferSessionHost,
  updateSession,
  SessionMember,
  LiveSession,
} from '../../../lib/api';
import { useAuthStore } from '../../../lib/authStore';
import { listFreePlaces } from '../../../lib/places';
import { useLocationStore } from '../../../lib/locationStore';
import { formatDistanceKm, haversineKm } from '../../../lib/location';
import {
  combineLocalDateTime,
  localHm,
  localYmd,
  type AgeGroup,
  type PlayMix,
  type SkillLevel,
} from '../../../lib/sessionFilters';

function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

export default function EditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const coords = useLocationStore((s) => s.coords);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sport, setSport] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [courtId, setCourtId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [description, setDescription] = useState('');
  const [playMix, setPlayMix] = useState<PlayMix>('mixed');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('any');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('any');
  const [gameDate, setGameDate] = useState(localYmd());
  const [gameTime, setGameTime] = useState('18:00');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [s, m] = await Promise.all([getSessionById(id), listSessionMembers(id)]);
    setSession(s);
    setMembers(m);
    if (s) {
      setSport(s.sport);
      setTitle(s.title);
      setLocation(s.location);
      setCourtId(s.courtId ?? null);
      setMaxPlayers(String(s.max));
      setDescription(s.description ?? '');
      setPlayMix(s.playMix ?? 'mixed');
      setAgeGroup(s.ageGroup ?? 'any');
      setSkillLevel(s.skillLevel ?? 'any');
      if (s.startsAt) {
        const d = new Date(s.startsAt);
        if (!Number.isNaN(d.getTime())) {
          setGameDate(localYmd(d));
          setGameTime(localHm(d));
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isHost = Boolean(session && userId && session.hostId === userId);

  const nearbyPlaces = useMemo(() => {
    return listFreePlaces()
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(coords, { lat: p.lat, lng: p.lng }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);
  }, [coords]);

  const otherMembers = members.filter((m) => m.userId !== userId);

  const onSave = async () => {
    if (!id || !sport) {
      notify('Pick a sport');
      return;
    }
    const max = Number(maxPlayers) || 8;
    setSaving(true);
    const res = await updateSession(id, {
      sport,
      title: title.trim() || `${sport} open play`,
      location: location.trim() || 'Ottawa',
      courtId,
      maxPlayers: max,
      description: description.trim(),
      startsAt: combineLocalDateTime(gameDate, gameTime).toISOString(),
      playMix,
      ageGroup,
      skillLevel,
    });
    setSaving(false);
    if (!res.ok) {
      notify('Could not save', res.error ?? 'Try again');
      return;
    }
    notify('Game updated');
    router.replace({
      pathname: '/session/[id]',
      params: {
        id,
        sport,
        title: title.trim() || `${sport} open play`,
        location: location.trim() || 'Ottawa',
        players: String(session?.players ?? 1),
        max: String(max),
      },
    });
  };

  const onTransfer = async (member: SessionMember) => {
    if (!id) return;
    const ok =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm(`Make ${member.name} the host? You’ll become a regular player.`)
        : true;
    if (!ok) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Transfer host?', `Make ${member.name} the host?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: () => void doTransfer(member),
        },
      ]);
      return;
    }
    await doTransfer(member);
  };

  const doTransfer = async (member: SessionMember) => {
    if (!id) return;
    setSaving(true);
    const res = await transferSessionHost(id, member.userId);
    setSaving(false);
    if (!res.ok) {
      notify('Could not transfer', res.error ?? 'Try again');
      return;
    }
    notify('Host transferred', `${member.name} is now the host.`);
    router.replace({ pathname: '/session/[id]', params: { id } });
  };

  const onRemove = async (member: SessionMember) => {
    if (!id) return;
    const ok =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm(`Remove ${member.name} from this game? They can join again if it’s still open.`)
        : true;
    if (!ok) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Remove player?', `Remove ${member.name} from this game?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void doRemove(member) },
      ]);
      return;
    }
    await doRemove(member);
  };

  const doRemove = async (member: SessionMember) => {
    if (!id) return;
    setSaving(true);
    const res = await removeSessionMember(id, member.userId);
    setSaving(false);
    if (!res.ok) {
      notify('Could not remove', res.error ?? 'Try again');
      return;
    }
    notify('Player removed', `${member.name} is no longer in this game.`);
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit game' }} />
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!session || !isHost) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit game' }} />
        <Text style={styles.err}>Only the host can edit this game.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back to chat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Edit game' }} />

      <Text style={styles.header}>Edit details</Text>
      <Text style={styles.sub}>Change sport, place, date, or who it’s for anytime before you play.</Text>

      <Text style={styles.label}>Sport</Text>
      <SportPicker mode="single" selected={sport} onChange={setSport} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Evening basketball"
        placeholderTextColor={theme.mutedSoft}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={(t) => {
          setLocation(t);
          setCourtId(null);
        }}
        placeholder="Place name or neighbourhood"
        placeholderTextColor={theme.mutedSoft}
      />

      <Text style={styles.hint}>Or pick a free place nearby</Text>
      <View style={styles.placeList}>
        {nearbyPlaces.map((p) => {
          const on = courtId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.placeChip, on && styles.placeChipOn]}
              onPress={() => {
                setCourtId(p.id);
                setLocation(p.name);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.placeChipText, on && styles.placeChipTextOn]} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.placeDist}>{formatDistanceKm(p.distanceKm)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Date</Text>
      <DateField value={gameDate} onChange={setGameDate} />
      <Text style={styles.label}>Time</Text>
      <TimeField value={gameTime} onChange={setGameTime} />

      <Text style={styles.label}>Max players</Text>
      <TextInput
        style={styles.input}
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        keyboardType="number-pad"
        placeholder="8"
        placeholderTextColor={theme.mutedSoft}
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={description}
        onChangeText={setDescription}
        placeholder="Time, skill vibe, bring a ball…"
        placeholderTextColor={theme.mutedSoft}
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

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => void onSave()}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save changes</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.section}>Players</Text>
      <Text style={styles.sub}>
        Make someone else host, or remove a player. You can’t remove yourself — transfer host first.
      </Text>
      {otherMembers.length === 0 ? (
        <Text style={styles.hint}>No other players yet — invite friends first.</Text>
      ) : (
        otherMembers.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <ProfileAvatar name={m.name} uri={m.avatarUrl} size={40} />
            <Text style={styles.memberName}>{m.name}</Text>
            <TouchableOpacity onPress={() => void onTransfer(m)} disabled={saving} hitSlop={8}>
              <Text style={styles.memberCta}>Make host</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void onRemove(m)} disabled={saving} hitSlop={8}>
              <Text style={styles.memberRemove}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
    padding: 24,
  },
  header: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 28,
    color: theme.ink,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.muted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.muted,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.ink,
    marginBottom: 8,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.mutedSoft,
    marginBottom: 8,
  },
  placeList: { gap: 8, marginBottom: 12 },
  placeChip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeChipOn: {
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,
  },
  placeChipText: {
    flex: 1,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: theme.ink,
  },
  placeChipTextOn: { color: theme.accentDark },
  placeDist: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.muted,
  },
  saveBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: theme.ballDark,
  },
  saveBtnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  section: {
    fontFamily: theme.fonts.display,
    fontSize: 20,
    color: theme.ink,
    marginTop: 28,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  memberName: {
    flex: 1,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    color: theme.ink,
  },
  memberCta: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.accentDark,
  },
  memberRemove: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.ballDark,
  },
  err: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: theme.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
  },
  backBtnText: {
    fontFamily: theme.fonts.bodyBold,
    color: '#fff',
  },
});
