import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MOCK_SESSIONS, PROFILES, SOLO_PLAYERS } from '../../constants/mockData';
import { WEDGE } from '../../constants/wedge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { SafetyGate } from '../../components/SafetyGate';
import { SportFilterBar } from '../../components/SportPicker';

export default function HomeScreen() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(WEDGE.primarySport);
  const liveCount = SOLO_PLAYERS.filter((p) => p.available.includes('now')).length;
  const sessions = sportFilter
    ? MOCK_SESSIONS.filter((s) => s.sport === sportFilter)
    : MOCK_SESSIONS;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SportMatchr</Text>
      <Text style={styles.sub}>{WEDGE.copy.homeSub}</Text>

      <View style={styles.pulse}>
        <Text style={styles.pulseEyebrow}>LIVE · {WEDGE.pocketName.toUpperCase()}</Text>
        <Text style={styles.pulseTitle}>{liveCount} solos ready to play</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/solos')} activeOpacity={0.85}>
          <Text style={styles.pulseCta}>Jump into Solos →</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.createBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/create')}
      >
        <Text style={styles.createBtnText}>+ Create Pickup Session</Text>
      </TouchableOpacity>

      <SportFilterBar selected={sportFilter} onChange={setSportFilter} />

      <Text style={styles.section}>
        Nearby Sessions{sportFilter ? ` · ${sportFilter}` : ''}
      </Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {sessions.length === 0 && (
          <Text style={{ color: '#64748B', marginBottom: 12, lineHeight: 20 }}>
            No {sportFilter} sessions yet. Create one and be the host.
          </Text>
        )}
        {sessions.map((s) => {
          const host = PROFILES[s.hostId];
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sport}>{s.sport}</Text>
                <Text style={styles.players}>
                  {s.players}/{s.max} players
                </Text>
              </View>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.meta}>
                {s.time} • {s.location}
              </Text>
              {s.recurring ? (
                <Text style={styles.recurring}>↻ {s.recurring}</Text>
              ) : null}
              {host && (
                <TouchableOpacity
                  style={styles.hostRow}
                  onPress={() => router.push(`/profile/${host.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.hostText}>Hosted by {host.name}</Text>
                  <VerifiedBadge level={host.verification} compact />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.joinBtn}
                activeOpacity={0.85}
                onPress={() => setPendingId(s.id)}
              >
                <Text style={styles.joinText}>Join + chat</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <SafetyGate
        visible={!!pendingId}
        title="Joining a public meetup"
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          const id = pendingId;
          setPendingId(null);
          if (id) router.push({ pathname: '/session/[id]', params: { id } });
        }}
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
  },
  pulse: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  pulseEyebrow: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  pulseTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 20,
    marginTop: 4,
  },
  pulseCta: {
    color: '#0D9488',
    fontWeight: '700',
    marginTop: 8,
  },
  createBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sport: {
    fontWeight: '700',
    color: '#0D9488',
    fontSize: 14,
  },
  players: {
    color: '#64748B',
    fontSize: 13,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 6,
  },
  recurring: {
    color: '#14B8A6',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hostText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#CCFBF1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  joinText: {
    color: '#0D9488',
    fontWeight: '700',
  },
});
