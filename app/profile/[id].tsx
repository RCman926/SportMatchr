import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { PlayerProfile, SAFETY_TIPS } from '../../constants/mockData';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { fetchProfileById, trustLabel } from '../../lib/api';
import { theme } from '../../constants/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const p = await fetchProfileById(id ?? '');
      if (alive) {
        setProfile(p);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.empty}>Couldn’t load this player.</Text>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasPhoto = Boolean(profile.avatarUrl);

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.name,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={goBack} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.exitBar} onPress={goBack} activeOpacity={0.85}>
          <Text style={styles.exitText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.hero}>
          <ProfileAvatar name={profile.name} uri={profile.avatarUrl} size={96} />
          {hasPhoto ? (
            <Text style={styles.photoOk}>Real face photo on profile</Text>
          ) : (
            <Text style={styles.photoWarn}>No face photo — meet with extra caution</Text>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.handle}>
            {profile.handle} · {profile.city}
          </Text>
          <VerifiedBadge level={profile.verification} />
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.gamesPlayed}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.shows ?? 0}</Text>
            <Text style={styles.statLabel}>Shows</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.noShows ?? 0}</Text>
            <Text style={styles.statLabel}>No-shows</Text>
          </View>
        </View>

        <Text style={styles.trust}>{trustLabel(profile)}</Text>

        {profile.lookingNow && (
          <View style={styles.live}>
            <Text style={styles.liveText}>Looking to play right now</Text>
          </View>
        )}

        <Text style={styles.section}>Sports</Text>
        <View style={styles.chips}>
          {profile.sports.map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Usually plays at</Text>
        {(profile.preferredCourts.length ? profile.preferredCourts : ['Public courts nearby']).map(
          (c) => (
            <Text key={c} style={styles.court}>
              · {c}
            </Text>
          )
        )}

        <Text style={[styles.section, { marginTop: 18 }]}>Before you meet</Text>
        {SAFETY_TIPS.slice(0, 3).map((tip) => (
          <Text key={tip} style={styles.tip}>
            · {tip}
          </Text>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: {
    backgroundColor: theme.bg,
    padding: 16,
    paddingBottom: 40,
  },
  exitBar: { marginBottom: 8 },
  exitText: { color: theme.ink, fontWeight: '800', fontSize: 14 },
  empty: { color: theme.muted, marginBottom: 12, fontFamily: theme.fonts.body },
  backLink: { color: theme.accent, fontFamily: theme.fonts.bodyBold },
  hero: { alignItems: 'center', marginBottom: 16 },
  photoOk: {
    color: theme.accentDark,
    fontWeight: '700',
    marginTop: 8,
    fontSize: 12,
  },
  photoWarn: {
    color: theme.warnFg,
    fontWeight: '700',
    marginTop: 8,
    fontSize: 12,
  },
  name: { fontSize: 28, fontWeight: '800', color: theme.ink, marginTop: 10 },
  handle: { color: theme.muted, marginTop: 4, marginBottom: 8 },
  bio: { color: theme.ink, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  stats: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: theme.ink, fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.accent, fontSize: 12, marginTop: 2 },
  trust: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: '600',
  },
  live: {
    backgroundColor: theme.accentSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  liveText: { color: theme.accentDark, fontWeight: '800' },
  section: {
    fontWeight: '800',
    color: theme.ink,
    marginBottom: 8,
    marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: theme.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: theme.accentDark, fontWeight: '700', fontSize: 13 },
  court: { color: theme.muted, marginBottom: 4, lineHeight: 20 },
  tip: { color: theme.muted, marginBottom: 6, lineHeight: 20 },
});
