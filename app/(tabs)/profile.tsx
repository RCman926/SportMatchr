import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  MY_PROFILE,
  VERIFICATION_LABEL,
  VerificationLevel,
  PlayerProfile,
} from '../../constants/mockData';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { SportPicker } from '../../components/SportPicker';
import { getSeasonalPopularSports } from '../../constants/sports';
import { WEDGE } from '../../constants/wedge';
import {
  fetchMyProfile,
  goLiveSolo,
  stopLiveSolo,
  updateMyProfile,
  uploadAvatar,
  seedFounderSessions,
  trustLabel,
} from '../../lib/api';
import { profilePhotoPrompt } from '../../lib/profilePhoto';
import { useAuthStore } from '../../lib/authStore';
import { useLocationStore } from '../../lib/locationStore';

const STEPS: { level: VerificationLevel; title: string; detail: string }[] = [
  {
    level: 'phone',
    title: 'Phone verification',
    detail: 'Confirm your number with a one-time code (coming soon). Email auth is live now.',
  },
  {
    level: 'photo',
    title: 'Photo match check',
    detail: 'Later: live selfie matched to your profile face photo.',
  },
  {
    level: 'id',
    title: 'ID verification (later)',
    detail: 'Only when abuse shows up — not a launch blocker.',
  },
];

const RANK = { none: 0, phone: 1, photo: 2, id: 3 } as const;

export default function ProfileScreen() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const presenceCoords = useLocationStore((s) => s.presenceCoords);

  const [profile, setProfile] = useState<PlayerProfile>(MY_PROFILE);
  const [lookingNow, setLookingNow] = useState(false);
  const [sports, setSports] = useState<string[]>(['Pickleball']);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(MY_PROFILE);
      setLookingNow(MY_PROFILE.lookingNow);
      setSports([...MY_PROFILE.sports]);
      setAvatarUri(MY_PROFILE.avatarUrl ?? null);
      setLoading(false);
      return;
    }
    const me = await fetchMyProfile();
    if (me) {
      setProfile(me);
      setLookingNow(me.lookingNow);
      setSports(me.sports);
      setAvatarUri(me.avatarUrl ?? null);
    }
    setLoading(false);
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!isSignedIn) return;
    void updateMyProfile({ sports });
  }, [sports, isSignedIn]);

  const addPhoto = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const uri = await profilePhotoPrompt();
    if (!uri) return;
    setAvatarUri(uri);
    const url = await uploadAvatar(uri);
    if (url) {
      setAvatarUri(url);
      Alert.alert('Photo saved', 'Uploaded to your SportMatchr profile.');
    } else {
      Alert.alert('Saved locally', 'Upload failed — photo kept on this device for now.');
    }
  };

  const myRank = RANK[profile.verification];

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#0D9488" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <TouchableOpacity onPress={addPhoto} activeOpacity={0.85}>
          <ProfileAvatar name={profile.name} uri={avatarUri} size={96} showPhotoHint />
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={addPhoto} activeOpacity={0.85}>
          <Text style={styles.photoBtnText}>
            {avatarUri ? 'Change face photo' : 'Add a real face photo'}
          </Text>
        </TouchableOpacity>
        {!avatarUri ? (
          <Text style={styles.photoWarn}>
            Required for safety — strangers need to recognize you at the court.
          </Text>
        ) : (
          <Text style={styles.photoOk}>Face photo on profile · safer meetups</Text>
        )}
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.handle}>
          {profile.handle} · {profile.neighbourhood ?? WEDGE.pocketName}
        </Text>
        {isSignedIn && user?.email ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}
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
        <View style={styles.stat}>
          <Text style={styles.statNum}>{profile.streakDays}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
      </View>

      <Text style={styles.trust}>{trustLabel(profile)}</Text>

      {isSignedIn ? (
        <>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={async () => {
              const res = await seedFounderSessions();
              if (res.error) Alert.alert('Seed failed', res.error);
              else if (res.created === 0)
                Alert.alert('Already seeded', 'You already have open host sessions.');
              else Alert.alert('Seeded', `Created ${res.created} sessions.`);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.authText}>Seed Glebe pickleball sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => {
              await signOut();
              Alert.alert('Signed out');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.authBtn}
          onPress={() => router.push('/auth')}
          activeOpacity={0.85}
        >
          <Text style={styles.authText}>Sign in for live sessions</Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Looking to play now</Text>
          <Text style={styles.hint}>Show up in Solos for instant games</Text>
        </View>
        <Switch
          value={lookingNow}
          onValueChange={async (v) => {
            if (!isSignedIn) {
              router.push('/auth');
              return;
            }
            if (v && !avatarUri) {
              Alert.alert('Add a face photo first', 'Required for safer Go Live.');
              return;
            }
            setLookingNow(v);
            if (v) {
              const res = await goLiveSolo(
                getSeasonalPopularSports()[0] ?? WEDGE.primarySport,
                presenceCoords()
              );
              if (!res.ok) Alert.alert('Failed', res.error ?? 'Try again');
            } else {
              await stopLiveSolo();
            }
            await updateMyProfile({ looking_now: v });
          }}
          trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
          thumbColor={lookingNow ? '#0D9488' : '#FFFFFF'}
        />
      </View>

      <SportPicker label="Sports I play" selected={sports} onChange={setSports} max={10} />
      <Text style={styles.pickerHint}>
        Pickleball first in {WEDGE.pocketName}. Other sports stay available.
      </Text>

      <Text style={styles.section}>Trust — face photo + sign in</Text>
      <Text style={styles.sectionSub}>
        Real face photo is required. Email magic link is live. Phone/ID come later.
      </Text>

      {STEPS.map((step) => {
        const done = myRank >= RANK[step.level];
        return (
          <View key={step.level} style={styles.verifyCard}>
            <View style={styles.verifyTop}>
              <Text style={styles.verifyTitle}>{step.title}</Text>
              <Text style={[styles.verifyStatus, done && styles.verifyDone]}>
                {done ? 'Done' : 'Later'}
              </Text>
            </View>
            <Text style={styles.verifyDetail}>{step.detail}</Text>
          </View>
        );
      })}

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Your safety status</Text>
        <Text style={styles.safetyBody}>
          {avatarUri ? 'Face photo set. ' : 'No face photo yet — add one. '}
          You’re {VERIFICATION_LABEL[profile.verification].toLowerCase()}.{' '}
          {isSignedIn ? 'Signed in to live backend.' : 'Guest — demo mode.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 16 },
  photoBtn: {
    marginTop: 10,
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  photoBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  photoWarn: {
    marginTop: 8,
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  photoOk: { marginTop: 8, color: '#0F766E', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  handle: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 4 },
  email: { fontSize: 12, color: '#0D9488', marginBottom: 8, fontWeight: '600' },
  bio: {
    marginTop: 10,
    textAlign: 'center',
    color: '#334155',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#0D9488', fontSize: 12, marginTop: 2 },
  trust: {
    color: '#5C6B62',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '600',
  },
  authBtn: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  authText: { color: '#0D9488', fontWeight: '800' },
  signOutBtn: { alignItems: 'center', marginBottom: 16, padding: 8 },
  signOutText: { color: '#EF4444', fontWeight: '700' },
  cardRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  hint: { fontSize: 13, color: '#64748B' },
  pickerHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 20,
    lineHeight: 17,
  },
  section: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  sectionSub: { color: '#64748B', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  verifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  verifyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  verifyTitle: { fontWeight: '800', color: '#0F172A', fontSize: 15 },
  verifyStatus: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  verifyDone: { color: '#0D9488' },
  verifyDetail: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  safetyCard: {
    marginTop: 8,
    backgroundColor: '#CCFBF1',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  safetyTitle: { fontWeight: '800', color: '#0D9488', marginBottom: 6 },
  safetyBody: { color: '#0F766E', lineHeight: 20, fontSize: 13 },
});
