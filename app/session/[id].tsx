import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { MOCK_SESSIONS, ChatMessage } from '../../constants/mockData';
import {
  cloneNextWeek,
  joinSession,
  listMessages,
  markHere,
  sendMessage,
  submitFeedback,
} from '../../lib/api';

function goBackToApp() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/home');
}

export default function SessionDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    sport?: string;
    title?: string;
    location?: string;
    time?: string;
    players?: string;
    max?: string;
    recurring?: string;
  }>();

  const session = useMemo(() => {
    const found = MOCK_SESSIONS.find((s) => s.id === params.id);
    if (found) {
      return {
        ...found,
        recurring: params.recurring || found.recurring,
      };
    }
    return {
      id: params.id ?? 'solo',
      sport: params.sport ?? 'Pickleball',
      title: params.title ?? 'Pickup chat',
      players: Number(params.players ?? 2),
      max: Number(params.max ?? 4),
      time: params.time ?? 'Now',
      location: params.location ?? 'Ottawa',
      description: 'Group chat for this pickup. Coordinate and meet up.',
      hostId: 'me',
      recurring: params.recurring || undefined,
    };
  }, [params]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [here, setHere] = useState(false);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      await joinSession(session.id);
      const msgs = await listMessages(session.id);
      if (alive) setMessages(msgs);
    })();
    return () => {
      alive = false;
    };
  }, [session.id]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const msg = await sendMessage(session.id, text);
    if (msg) setMessages((prev) => [...prev, msg]);
  };

  const onHere = async () => {
    await markHere(session.id);
    setHere(true);
    Alert.alert('You’re here', 'Others in this session can see you checked in at the public court.');
  };

  const onWouldPlayAgain = async (yes: boolean) => {
    await submitFeedback({
      sessionId: session.id,
      wouldPlayAgain: yes,
      rating: yes ? 5 : 3,
      wantRematch: yes,
    });
    setRated(true);
  };

  const onRematch = async () => {
    await submitFeedback({
      sessionId: session.id,
      wantRematch: true,
      wouldPlayAgain: true,
    });
    Alert.alert('Rematch flagged', 'Same crew — open Create or wait for the host to spin a rematch.');
  };

  const onNextWeek = async () => {
    await submitFeedback({
      sessionId: session.id,
      wantNextWeek: true,
      wouldPlayAgain: true,
    });
    const next = await cloneNextWeek(session);
    Alert.alert('Next week booked', 'Same time, same court. Chat opened for the follow-up session.');
    router.push({
      pathname: '/session/[id]',
      params: {
        id: next.id,
        sport: session.sport,
        title: session.title,
        location: session.location,
        time: session.recurring ?? 'Next week',
        players: '1',
        max: String(session.max),
        recurring: session.recurring ?? 'Weekly',
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: session.sport,
          headerLeft: () => (
            <TouchableOpacity onPress={goBackToApp} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: '#0D9488', fontWeight: '800', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.exitBar} onPress={goBackToApp} activeOpacity={0.85}>
            <Text style={styles.exitText}>← Back to Home (tabs return here)</Text>
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.meta}>
              {session.time} · {session.location}
            </Text>
            <Text style={styles.meta}>
              {session.players}/{session.max} players · Group chat
            </Text>
            {session.recurring ? (
              <Text style={styles.recurring}>↻ {session.recurring}</Text>
            ) : null}
            {session.description ? (
              <Text style={styles.desc}>{session.description}</Text>
            ) : null}
            <View style={styles.safety}>
              <Text style={styles.safetyText}>
                Safety: meet at the public court only. Don’t share your address. Report anyone who feels off.
              </Text>
            </View>

            <View style={styles.retentionRow}>
              <TouchableOpacity
                style={[styles.retBtn, here && styles.retBtnOn]}
                onPress={onHere}
                activeOpacity={0.85}
              >
                <Text style={[styles.retText, here && styles.retTextOn]}>
                  {here ? '● I’m here' : 'I’m here'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retBtn} onPress={onRematch} activeOpacity={0.85}>
                <Text style={styles.retText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retBtn} onPress={onNextWeek} activeOpacity={0.85}>
                <Text style={styles.retText}>Next week</Text>
              </TouchableOpacity>
            </View>

            {!rated ? (
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Would play again?</Text>
                <TouchableOpacity style={styles.yesBtn} onPress={() => onWouldPlayAgain(true)}>
                  <Text style={styles.yesText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noBtn} onPress={() => onWouldPlayAgain(false)}>
                  <Text style={styles.noText}>No</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.rated}>Thanks — that helps the crew stay solid.</Text>
            )}
          </View>

          <Text style={styles.chatLabel}>Group chat</Text>

          <ScrollView
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleOther]}
              >
                {!m.mine && <Text style={styles.sender}>{m.sender}</Text>}
                <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>
                  {m.text}
                </Text>
                <Text style={[styles.at, m.mine && styles.atMine]}>{m.at}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Message the group…"
              placeholderTextColor="#94A3B8"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.85}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  exitBar: {
    backgroundColor: '#F4F6F8',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  exitText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  info: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  meta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
  },
  recurring: {
    marginTop: 6,
    color: '#14B8A6',
    fontWeight: '700',
    fontSize: 12,
  },
  desc: {
    marginTop: 8,
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  safety: {
    marginTop: 12,
    backgroundColor: '#CCFBF1',
    borderRadius: 10,
    padding: 10,
  },
  safetyText: {
    color: '#0D9488',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  retentionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  retBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
  },
  retBtnOn: {
    backgroundColor: '#0D9488',
  },
  retText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 12,
  },
  retTextOn: {
    color: '#FFFFFF',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  rateLabel: { color: '#334155', fontWeight: '600', fontSize: 13, flex: 1 },
  yesBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yesText: { color: '#000', fontWeight: '800' },
  noBtn: {
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noText: { color: '#64748B', fontWeight: '700' },
  rated: { marginTop: 10, color: '#64748B', fontSize: 12 },
  chatLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontWeight: '700',
    color: '#0F172A',
  },
  chat: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 8,
    gap: 8,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#0D9488',
  },
  sender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 15,
    color: '#0F172A',
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  at: {
    marginTop: 4,
    fontSize: 10,
    color: '#64748B',
  },
  atMine: {
    color: '#CCFBF1',
    textAlign: 'right',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  sendBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
