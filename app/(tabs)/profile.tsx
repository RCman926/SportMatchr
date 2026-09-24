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
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  VERIFICATION_LABEL,
  VerificationLevel,
  PlayerProfile,
} from '../../constants/mockData';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { SportPicker } from '../../components/SportPicker';
import { getSeasonalPopularSports } from '../../constants/sports';
import { RecordCard } from '../../components/RecordCard';
import { PageHero } from '../../components/SportScene';
import { WEDGE } from '../../constants/wedge';
import {
  fetchMyProfile,
  goLiveSolo,
  stopLiveSolo,
  updateMyProfile,
  uploadAvatar,
  deleteMyAccount,
  seedFounderSessions,
  trustLabel,
} from '../../lib/api';
import { clearProfilePhoto, profilePhotoPrompt } from '../../lib/profilePhoto';
import { useAuthStore } from '../../lib/authStore';
import { useLocationStore } from '../../lib/locationStore';
import { canAccessFounderOps } from '../../lib/founder';
import { theme } from '../../constants/theme';

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

const EMPTY_GUEST: PlayerProfile = {
  id: 'guest',
  name: 'Guest',
  handle: '@you',
  bio: 'Create a free account to host, join games, and show up on Looking.',
  city: 'Ottawa',
  neighbourhood: WEDGE.pocketName,
  sports: [],
  skill: 'Any',
  verification: 'none',
  gamesPlayed: 0,
  rating: 5,
  streakDays: 0,
  memberSince: '',
  preferredCourts: [],
  lookingNow: false,
  shows: 0,
  noShows: 0,
};

export default function ProfileScreen() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const canAct = useAuthStore((s) => s.canAct);
  const isFounderPreview = useAuthStore((s) => s.isFounderPreview);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const exitFounderPreview = useAuthStore((s) => s.exitFounderPreview);
  const presenceCoords = useLocationStore((s) => s.presenceCoords);
  const founderOps = canAccessFounderOps({
    email: user?.email,
    isFounderPreview,
  });

  const [profile, setProfile] = useState<PlayerProfile>(EMPTY_GUEST);
  const [lookingNow, setLookingNow] = useState(false);
  const [sports, setSports] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(EMPTY_GUEST);
      setLookingNow(false);
      setSports([]);
      setAvatarUri(null);
      setLoading(false);
      return;
    }
    const me = await fetchMyProfile();
    if (me) {
      setProfile(me);
      setLookingNow(me.lookingNow);
      setSports(me.sports?.length ? me.sports : []);
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

  const deleteAccount = async () => {
    const message =
      'This permanently deletes your profile, hosted games, memberships, messages, and photo. This cannot be undone.';
    const confirmed =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm(`Delete your SportMatchr account?\n\n${message}`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Delete your account?', message, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Delete permanently',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteMyAccount();
    setDeleting(false);
    if (!result.ok) {
      Alert.alert('Couldn’t delete account', result.error ?? 'Try again');
      return;
    }
    await clearProfilePhoto();
    router.replace('/(tabs)/home');
  };

  const myRank = RANK[profile.verification];

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!isSignedIn && !isFounderPreview) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <PageHero caption="Your profile · Ottawa" />
        <View style={styles.hero}>
          <ProfileAvatar name="You" uri={null} size={96} showPhotoHint />
          <Text style={styles.name}>Your profile</Text>
          <Text style={styles.bio}>
            Browse free places without an account. Sign up free to host, join games, chat, or say
            you’re free on Looking.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.authBtn}
          onPress={() => router.push('/auth')}
          activeOpacity={0.85}
        >
          <Text style={styles.authText}>Sign up / sign in</Text>
        </TouchableOpacity>
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Your safety status</Text>
          <Text style={styles.safetyBody}>Guest — browse only. No account yet.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <PageHero caption={`${WEDGE.city} · play near you`} />
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
            Recommended for safer meetups — strangers can recognize you at the court.
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

      {isSignedIn ? (
        <>
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
          <RecordCard profile={profile} />
        </>
      ) : null}

      {isFounderPreview ? (
        <TouchableOpacity
          style={styles.authBtn}
          onPress={async () => {
            await exitFounderPreview();
            Alert.alert('Founder preview off');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.authText}>Exit founder preview</Text>
        </TouchableOpacity>
      ) : null}

      {isSignedIn ? (
        <>
          {founderOps ? (
            <TouchableOpacity
              style={styles.authBtn}
              onPress={async () => {
                const res = await seedFounderSessions();
                if (res.error) Alert.alert('Seed failed', res.error);
                else if (res.created === 0)
                  Alert.alert('Already seeded', 'You already have open host sessions.');
                else Alert.alert('Seeded', `Created ${res.created} multi-sport sessions.`);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.authText}>Seed multi-sport Ottawa sessions</Text>
            </TouchableOpacity>
          ) : null}
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
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => void deleteAccount()}
            activeOpacity={0.85}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account permanently"
          >
            <Text style={styles.deleteText}>
              {deleting ? 'Deleting account…' : 'Delete account permanently'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.authBtn}
          onPress={() => router.push('/auth')}
          activeOpacity={0.85}
        >
          <Text style={styles.authText}>Create a real account</Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>I’m ready now</Text>
          <Text style={styles.hint}>Green on the board — people looking for a game</Text>
        </View>
        <Switch
          value={lookingNow}
          onValueChange={async (v) => {
            if (!canAct) {
              router.push('/auth');
              return;
            }
            setLookingNow(v);
            if (v) {
              const res = await goLiveSolo(
                sports[0] ?? getSeasonalPopularSports()[0] ?? WEDGE.primarySport,
                presenceCoords()
              );
              if (!res.ok) {
                setLookingNow(false);
                Alert.alert('Failed', res.error ?? 'Try again');
                return;
              }
            } else {
              await stopLiveSolo();
            }
            if (isSignedIn) await updateMyProfile({ looking_now: v });
          }}
          trackColor={{ false: theme.borderStrong, true: theme.accent }}
          thumbColor={lookingNow ? theme.accent : theme.surfaceRaised}
        />
      </View>

      {isSignedIn ? (
        <>
          <SportPicker label="Sports I play" selected={sports} onChange={setSports} max={10} />
          <Text style={styles.pickerHint}>
            Multi-sport Ottawa — pick what you actually play.
          </Text>
        </>
      ) : null}

      <Text style={styles.section}>Trust — face photo + sign in</Text>
      <Text style={styles.sectionSub}>
        A real face photo is required before Join or Looking so people can recognize you at the
        public place. Phone verification is next; ID only if abuse requires it.
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

      <TouchableOpacity
        style={styles.legalBtn}
        onPress={() => router.push('/legal')}
        activeOpacity={0.85}
      >
        <Text style={styles.legalBtnText}>Terms & privacy</Text>
      </TouchableOpacity>

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Your safety status</Text>
        <Text style={styles.safetyBody}>
          {avatarUri ? 'Face photo set. ' : 'No face photo yet — add one before joining. '}
          You’re {VERIFICATION_LABEL[profile.verification].toLowerCase()}.{' '}
          {isSignedIn
            ? 'Signed in.'
            : isFounderPreview
              ? 'Founder preview — sample data, full UI.'
              : 'Guest — browse only.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  container: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 16 },
  photoBtn: {
    marginTop: 10,
    backgroundColor: theme.ball,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  photoBtnText: { color: theme.surfaceRaised, fontFamily: theme.fonts.bodyBold, fontSize: 13 },
  photoWarn: {
    marginTop: 8,
    color: theme.warnFg,
    fontSize: 12,
    fontFamily: theme.fonts.bodyMed,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  photoOk: { marginTop: 8, color: theme.accentDark, fontSize: 12, fontFamily: theme.fonts.bodyBold },
  name: { fontSize: 28, fontFamily: theme.fonts.displayBold, color: theme.ink, marginTop: 10 },
  handle: { fontSize: 14, color: theme.muted, marginTop: 4, marginBottom: 4, fontFamily: theme.fonts.body },
  email: { fontSize: 12, color: theme.accent, marginBottom: 8, fontFamily: theme.fonts.bodyMed },
  bio: {
    marginTop: 10,
    textAlign: 'center',
    color: theme.muted,
    lineHeight: 20,
    paddingHorizontal: 12,
    fontFamily: theme.fonts.body,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: theme.ink, fontSize: 22, fontFamily: theme.fonts.displayBold },
  statLabel: { color: theme.accent, fontSize: 12, marginTop: 2, fontFamily: theme.fonts.bodyMed },
  trust: {
    color: theme.muted,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: theme.fonts.body,
  },
  authBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  authText: { color: theme.surfaceRaised, fontFamily: theme.fonts.bodyBold, fontSize: 15 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: theme.surfaceRaised,
  },
  signOutText: { color: theme.muted, fontFamily: theme.fonts.bodyBold, fontSize: 14 },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  deleteText: {
    color: theme.danger,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: { fontSize: 15, fontFamily: theme.fonts.bodyBold, color: theme.ink },
  hint: { fontSize: 12, color: theme.muted, marginTop: 2, fontFamily: theme.fonts.body },
  pickerHint: { fontSize: 12, color: theme.muted, marginBottom: 16, marginTop: -4, fontFamily: theme.fonts.body },
  section: {
    fontSize: 18,
    fontFamily: theme.fonts.displayBold,
    color: theme.ink,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionSub: { fontSize: 13, color: theme.muted, marginBottom: 12, lineHeight: 18, fontFamily: theme.fonts.body },
  verifyCard: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  verifyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  verifyTitle: { fontFamily: theme.fonts.bodyBold, color: theme.ink, fontSize: 14 },
  verifyStatus: { color: theme.mutedSoft, fontSize: 12, fontFamily: theme.fonts.bodyBold },
  verifyDone: { color: theme.accent },
  verifyDetail: { color: theme.muted, fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.body },
  legalBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: theme.surfaceRaised,
  },
  legalBtnText: { color: theme.ink, fontFamily: theme.fonts.bodyBold, fontSize: 14 },
  safetyCard: {
    marginTop: 16,
    backgroundColor: theme.accentSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  safetyTitle: { fontFamily: theme.fonts.bodyBold, color: theme.accentDark, marginBottom: 6 },
  safetyBody: { color: theme.accentDark, fontSize: 13, lineHeight: 18, fontFamily: theme.fonts.body },
});
