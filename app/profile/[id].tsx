import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { PROFILES, SAFETY_TIPS } from '../../constants/mockData';
import { VerifiedBadge } from '../../components/VerifiedBadge';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = PROFILES[id ?? ''] ?? PROFILES.alex;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.name,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={goBack} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: '#0D9488', fontWeight: '800', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.exitBar} onPress={goBack} activeOpacity={0.85}>
          <Text style={styles.exitText}>← Back to Home</Text>
        </TouchableOpacity>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name[0]}</Text>
          </View>
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

        {profile.lookingNow && (
          <View style={styles.live}>
            <Text style={styles.liveText}>● Looking to play right now</Text>
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
        {profile.preferredCourts.map((c) => (
          <Text key={c} style={styles.court}>
            · {c}
          </Text>
        ))}

        <Text style={[styles.section, { marginTop: 18 }]}>Before you meet</Text>
        {SAFETY_TIPS.slice(0, 3).map((tip) => (
          <Text key={tip} style={styles.tip}>
            · {tip}
          </Text>
        ))}

        <TouchableOpacity
          style={styles.playBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/session/[id]',
              params: {
                id: `solo-${profile.id}`,
                sport: profile.sports[0],
                title: `Let's play — ${profile.name}`,
                location: profile.preferredCourts[0] ?? 'Ottawa',
                time: 'Now',
                players: '2',
                max: '4',
              },
            })
          }
        >
          <Text style={styles.playText}>Message / Let’s play</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportBtn} activeOpacity={0.85}>
          <Text style={styles.reportText}>Report profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
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
  hero: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#0F172A', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  handle: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 8 },
  bio: {
    marginTop: 10,
    textAlign: 'center',
    color: '#334155',
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#0D9488', fontSize: 12, marginTop: 2 },
  live: {
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  liveText: { color: '#0F766E', fontWeight: '800' },
  section: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { color: '#0F766E', fontWeight: '700', fontSize: 13 },
  court: { color: '#64748B', marginBottom: 4, fontSize: 14 },
  tip: { color: '#64748B', marginBottom: 6, fontSize: 13, lineHeight: 18 },
  playBtn: {
    marginTop: 20,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  reportBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  reportText: { color: '#EF4444', fontWeight: '700' },
});
