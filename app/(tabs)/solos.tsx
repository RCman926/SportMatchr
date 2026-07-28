import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { SOLO_PLAYERS, VERIFICATION_RANK } from '../../constants/mockData';
import { WEDGE } from '../../constants/wedge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SafetyGate } from '../../components/SafetyGate';
import { SportFilterBar } from '../../components/SportPicker';
import { goLiveSolo, stopLiveSolo } from '../../lib/api';

type PendingAction = {
  id: string;
  sport: string;
  title: string;
  location: string;
  time: string;
} | null;

export default function SolosScreen() {
  const [imLive, setImLive] = useState(false);
  /** Default OFF until Solos has real supply — hard filter kills empty markets */
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | null>('Pickleball');
  const [pending, setPending] = useState<PendingAction>(null);

  const players = useMemo(() => {
    let list = verifiedOnly
      ? SOLO_PLAYERS.filter((p) => VERIFICATION_RANK[p.verification] >= 1)
      : SOLO_PLAYERS;
    if (sportFilter) {
      list = list.filter((p) => p.sport === sportFilter);
    }
    return [...list].sort(
      (a, b) => VERIFICATION_RANK[b.verification] - VERIFICATION_RANK[a.verification]
    );
  }, [verifiedOnly, sportFilter]);

  const liveCount = SOLO_PLAYERS.filter((p) => p.available.includes('now')).length;

  const openChat = (action: NonNullable<PendingAction>) => {
    setPending(null);
    router.push({
      pathname: '/session/[id]',
      params: {
        id: `solo-${action.id}`,
        sport: action.sport,
        title: action.title,
        location: action.location,
        time: action.time,
        players: '2',
        max: '4',
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Solos</Text>
      <Text style={styles.sub}>
        Instant games in {WEDGE.pocketName}. Pickleball first — message someone free near you.
      </Text>

      <View style={styles.pulse}>
        <Text style={styles.pulseTitle}>{liveCount} people ready near you</Text>
        <Text style={styles.pulseSub}>{WEDGE.copy.pulseArea}</Text>
      </View>

      <SportFilterBar selected={sportFilter} onChange={setSportFilter} />

      <TouchableOpacity
        style={[styles.liveBtn, imLive && styles.liveBtnOn]}
        activeOpacity={0.85}
        onPress={async () => {
          const next = !imLive;
          setImLive(next);
          if (next) await goLiveSolo(sportFilter ?? WEDGE.primarySport);
          else await stopLiveSolo();
        }}
      >
        <Text style={[styles.liveBtnText, imLive && styles.liveBtnTextOn]}>
          {imLive ? '● You’re live — nearby solos can see you' : 'Go live — looking to play now'}
        </Text>
      </TouchableOpacity>

      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterLabel}>Verified only</Text>
          <Text style={styles.filterHint}>Optional — off until the feed is full</Text>
        </View>
        <Switch
          value={verifiedOnly}
          onValueChange={setVerifiedOnly}
          trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
          thumbColor={verifiedOnly ? '#0D9488' : '#FFFFFF'}
        />
      </View>

      <Text style={styles.section}>
        Nearby solos{sportFilter ? ` · ${sportFilter}` : ''}
      </Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {players.length === 0 && (
          <Text style={styles.empty}>
            No solos for {sportFilter ?? 'this filter'} yet. Try another sport or go live yourself.
          </Text>
        )}
        {players.map((p) => (
          <View key={p.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/${p.profileId}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{p.name}</Text>
                  <VerifiedBadge level={p.verification} compact />
                </View>
                <Text style={styles.meta}>
                  {p.sport} · {p.skill} · {p.distanceKm} km · ★ {p.rating} · {p.gamesPlayed} games
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{p.available}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.looking}>{p.lookingFor}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.msgBtn}
                activeOpacity={0.85}
                onPress={() =>
                  setPending({
                    id: p.id,
                    sport: p.sport,
                    title: `Solo with ${p.name}`,
                    location: 'Public court · Ottawa',
                    time: p.available,
                  })
                }
              >
                <Text style={styles.msgText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playBtn}
                activeOpacity={0.85}
                onPress={() =>
                  setPending({
                    id: p.id,
                    sport: p.sport,
                    title: `Let's play — ${p.sport}`,
                    location: 'Meet at mapped public court',
                    time: 'Now',
                  })
                }
              >
                <Text style={styles.playText}>Let’s play</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <SafetyGate
        visible={!!pending}
        title="Before you message / meet"
        onCancel={() => setPending(null)}
        onConfirm={() => pending && openChat(pending)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 21,
  },
  pulse: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  pulseTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  pulseSub: {
    color: '#0D9488',
    marginTop: 4,
    fontSize: 13,
  },
  liveBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBtnOn: {
    backgroundColor: '#0D9488',
  },
  liveBtnText: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 15,
  },
  liveBtnTextOn: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  filterLabel: {
    fontWeight: '700',
    color: '#0F172A',
  },
  filterHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0F172A',
  },
  empty: {
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
  },
  looking: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  msgBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  msgText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  playBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
