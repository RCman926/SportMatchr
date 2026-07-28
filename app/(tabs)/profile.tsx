import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { MY_PROFILE, VERIFICATION_LABEL, VerificationLevel } from '../../constants/mockData';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SportPicker } from '../../components/SportPicker';
import { WEDGE } from '../../constants/wedge';
import { goLiveSolo, stopLiveSolo } from '../../lib/api';

const STEPS: { level: VerificationLevel; title: string; detail: string }[] = [
  {
    level: 'phone',
    title: 'Phone verification',
    detail: 'Early trust gate — confirm your number with a one-time code.',
  },
  {
    level: 'photo',
    title: 'Photo verification (optional early)',
    detail: 'Live selfie later — not required while the pocket is seeding.',
  },
  {
    level: 'id',
    title: 'ID verification (later)',
    detail: 'Only when abuse shows up — not a launch blocker.',
  },
];

const RANK = { none: 0, phone: 1, photo: 2, id: 3 } as const;

export default function ProfileScreen() {
  const [lookingNow, setLookingNow] = useState(MY_PROFILE.lookingNow);
  const [sports, setSports] = useState<string[]>([...MY_PROFILE.sports]);
  const me = MY_PROFILE;
  const myRank = RANK[me.verification];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{me.name[0]}</Text>
        </View>
        <Text style={styles.name}>{me.name}</Text>
        <Text style={styles.handle}>
          {me.handle} · {me.neighbourhood ?? WEDGE.pocketName}
        </Text>
        <VerifiedBadge level={me.verification} />
        <Text style={styles.bio}>{me.bio}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{me.gamesPlayed}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{me.shows ?? 0}</Text>
          <Text style={styles.statLabel}>Shows</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{me.noShows ?? 0}</Text>
          <Text style={styles.statLabel}>No-shows</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{me.streakDays}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.authBtn}
        onPress={() => router.push('/auth')}
        activeOpacity={0.85}
      >
        <Text style={styles.authText}>Sign in for live sessions</Text>
      </TouchableOpacity>

      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Looking to play now</Text>
          <Text style={styles.hint}>Show up in Solos for instant games</Text>
        </View>
        <Switch
          value={lookingNow}
          onValueChange={async (v) => {
            setLookingNow(v);
            if (v) await goLiveSolo(WEDGE.primarySport);
            else await stopLiveSolo();
          }}
          trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
          thumbColor={lookingNow ? '#0D9488' : '#FFFFFF'}
        />
      </View>

      <SportPicker
        label="Sports I play"
        selected={sports}
        onChange={setSports}
        max={10}
      />
      <Text style={styles.pickerHint}>
        Choose from sports people actually play around Ottawa (hockey, shinny, pickleball, climbing…).
      </Text>

      <Text style={styles.section}>Trust — phone first</Text>
      <Text style={styles.sectionSub}>
        Public courts + report + phone verify. Photo/ID stay optional until the pocket has density.
      </Text>

      {STEPS.map((step) => {
        const done = myRank >= RANK[step.level];
        const current = me.verification === step.level;
        return (
          <View key={step.level} style={styles.verifyCard}>
            <View style={styles.verifyTop}>
              <Text style={styles.verifyTitle}>{step.title}</Text>
              <Text style={[styles.verifyStatus, done && styles.verifyDone]}>
                {done ? 'Done' : 'Next'}
              </Text>
            </View>
            <Text style={styles.verifyDetail}>{step.detail}</Text>
            {!done && (
              <TouchableOpacity style={styles.verifyBtn} activeOpacity={0.85}>
                <Text style={styles.verifyBtnText}>
                  {current
                    ? 'Upgrade verification'
                    : `Start ${step.title.split(' ')[0].toLowerCase()} check`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Your safety status</Text>
        <Text style={styles.safetyBody}>
          You’re {VERIFICATION_LABEL[me.verification].toLowerCase()}. Phone is enough to start.
          Shows / no-shows build reputation after real games — not ID theatre.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  handle: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 8 },
  bio: {
    marginTop: 10,
    textAlign: 'center',
    color: '#334155',
    lineHeight: 20,
    paddingHorizontal: 12,
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
  authBtn: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  authText: { color: '#0D9488', fontWeight: '800' },
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
  section: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  verifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  verifyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifyTitle: { fontWeight: '800', color: '#0F172A', fontSize: 15 },
  verifyStatus: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  verifyDone: { color: '#0D9488' },
  verifyDetail: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  verifyBtn: {
    marginTop: 12,
    backgroundColor: '#F4F6F8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyBtnText: { color: '#0F172A', fontWeight: '700', fontSize: 13 },
  safetyCard: {
    marginTop: 8,
    backgroundColor: '#CCFBF1',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  safetyTitle: { fontWeight: '800', color: '#0D9488', marginBottom: 6 },
  safetyBody: { color: '#0D9488', lineHeight: 20, fontSize: 13 },
});
