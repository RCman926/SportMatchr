import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { WEDGE } from '../../constants/wedge';
import { listMySessions, LiveSession } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const list = await listMySessions();
    setSessions(list);
    setLoading(false);
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Sessions</Text>
      <Text style={styles.sub}>
        Recurring hosts win {WEDGE.pocketName}. Open chat · rematch · next week.
      </Text>

      {!isSignedIn ? (
        <TouchableOpacity style={styles.create} onPress={() => router.push('/auth')} activeOpacity={0.85}>
          <Text style={styles.createText}>Sign in to see your sessions</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.create} onPress={() => router.push('/create')} activeOpacity={0.85}>
          <Text style={styles.createText}>+ Host a recurring pickup</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color="#0D9488" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          {sessions.length === 0 && isSignedIn ? (
            <Text style={styles.empty}>No sessions yet. Host one or join from Home.</Text>
          ) : null}
          {sessions.map((s) => (
            <TouchableOpacity
              key={`${s.id}-${s.role}`}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: s.id, recurring: s.recurring ?? '' },
                })
              }
            >
              <View style={styles.row}>
                <Text style={styles.sport}>{s.sport}</Text>
                <Text style={styles.role}>{s.role ?? 'Joined'}</Text>
              </View>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.meta}>
                {s.time} · {s.location}
              </Text>
              {s.recurring ? <Text style={styles.recurring}>↻ {s.recurring}</Text> : null}
              <Text style={styles.chatLink}>Open group chat →</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 16 },
  header: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 14, color: '#64748B', marginBottom: 12, lineHeight: 20 },
  create: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createText: { color: '#FFFFFF', fontWeight: '800' },
  empty: { color: '#64748B', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sport: { fontWeight: '700', color: '#0D9488', fontSize: 14 },
  role: { color: '#64748B', fontSize: 13 },
  title: { fontSize: 17, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  meta: { color: '#64748B', fontSize: 13 },
  recurring: { marginTop: 6, color: '#14B8A6', fontWeight: '700', fontSize: 12 },
  chatLink: { marginTop: 10, color: '#0F766E', fontWeight: '700', fontSize: 13 },
});
