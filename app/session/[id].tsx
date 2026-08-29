import { useEffect, useMemo, useState } from 'react';
import { theme } from '../../constants/theme';
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
import { ChatMessage } from '../../constants/mockData';
import {
  cloneNextWeek,
  getSessionById,
  joinSession,
  listMessages,
  listSessionMembers,
  markHere,
  removeSessionMember,
  sendMessage,
  submitFeedback,
  subscribeMessages,
  LiveSession,
  SessionMember,
} from '../../lib/api';
import { bookingDetailChips, genderGateReason } from '../../constants/booking';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { ReportSheet } from '../../components/ReportSheet';
import { useAuthStore } from '../../lib/authStore';
import { useProfileStore } from '../../lib/profileStore';

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
    genderPlay?: string;
    ageGroup?: string;
    skillLevel?: string;
    notes?: string;
  }>();

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const myUserId = useAuthStore((s) => s.user?.id ?? null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [here, setHere] = useState(false);
  const [rated, setRated] = useState(false);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [memberFilter, setMemberFilter] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const myGender = useProfileStore((s) => s.gender);

  const session = useMemo(() => {
    if (liveSession) {
      return {
        ...liveSession,
        recurring: params.recurring || liveSession.recurring,
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
  }, [liveSession, params]);

  const genderPlay = params.genderPlay ?? liveSession?.genderPlay;

  const detailChips = useMemo(
    () =>
      bookingDetailChips({
        genderPlay,
        ageGroup: params.ageGroup ?? liveSession?.ageGroup,
        skillLevel: params.skillLevel ?? liveSession?.skillLevel,
      }),
    [genderPlay, params.ageGroup, params.skillLevel, liveSession]
  );

  const gateReason = useMemo(
    () => genderGateReason(genderPlay, myGender),
    [genderPlay, myGender]
  );
  const blocked = Boolean(gateReason);

  const isHost = useMemo(() => {
    if (session.hostId === 'me') return true;
    if (myUserId && session.hostId === myUserId) return true;
    return false;
  }, [session.hostId, myUserId]);

  const filteredMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.skill ?? '').toLowerCase().includes(q) ||
        (m.neighbourhood ?? '').toLowerCase().includes(q)
    );
  }, [members, memberFilter]);

  const onRemoveMember = async (member: SessionMember) => {
    setConfirmRemoveId(null);
    const prev = members;
    setMembers((list) => list.filter((m) => m.userId !== member.userId));
    const res = await removeSessionMember(session.id, member.userId);
    if (!res.ok) {
      setMembers(prev); // revert on failure
      Alert.alert('Could not remove', res.error ?? 'Try again.');
    }
  };

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | undefined;

    (async () => {
      if (isSignedIn && params.id && !params.id.startsWith('solo-') && !params.id.startsWith('mock-')) {
        // Don't auto-join a women-only game the viewer can't join.
        const blockedForJoin = Boolean(genderGateReason(params.genderPlay, myGender));
        if (!blockedForJoin) await joinSession(params.id);
        const s = await getSessionById(params.id);
        if (alive && s) setLiveSession(s);
      }

      const msgs = await listMessages(params.id ?? 'solo', { live: isSignedIn });
      if (alive) setMessages(msgs);

      const threadId = params.id ?? 'solo';
      if (!threadId.startsWith('solo')) {
        const roster = await listSessionMembers(threadId);
        if (alive) setMembers(roster);
      }

      if (isSignedIn && params.id) {
        unsub = subscribeMessages(params.id, (msg) => {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
      }
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, [params.id, isSignedIn, params.genderPlay, myGender]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const msg = await sendMessage(params.id ?? 'solo', text);
    if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const onHere = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    await markHere(session.id);
    setHere(true);
    Alert.alert('You’re here', 'Checked in at the public court.');
  };

  const onWouldPlayAgain = async (yes: boolean) => {
    await submitFeedback({
      sessionId: session.id,
      wouldPlayAgain: yes,
      wantRematch: yes,
      showedUp: true,
    });
    setRated(true);
  };

  const onRematch = async () => {
    await submitFeedback({
      sessionId: session.id,
      wantRematch: true,
      wouldPlayAgain: true,
    });
    Alert.alert('Rematch flagged', 'Same crew — ask the host or create a follow-up.');
  };

  const onNextWeek = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    await submitFeedback({
      sessionId: session.id,
      wantNextWeek: true,
      wouldPlayAgain: true,
    });
    const next = await cloneNextWeek(session);
    if (next.error || !next.id) {
      Alert.alert('Could not book next week', next.error ?? 'Try again');
      return;
    }
    Alert.alert('Next week booked', 'Same vibe, new session chat.');
    router.replace({
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
              <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 16 }}>← Back</Text>
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
            <Text style={styles.exitText}>← Back to Home</Text>
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.meta}>
              {session.time} · {session.location}
            </Text>
            <Text style={styles.meta}>
              {session.players}/{session.max} players ·{' '}
              {isSignedIn ? 'Live group chat' : 'Demo chat (sign in for live)'}
            </Text>
            {session.recurring ? <Text style={styles.recurring}>↻ {session.recurring}</Text> : null}
            {detailChips.length ? (
              <View style={styles.detailChips}>
                {detailChips.map((c) => (
                  <View key={c} style={styles.detailChip}>
                    <Text style={styles.detailChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {session.description ? <Text style={styles.desc}>{session.description}</Text> : null}
            {params.notes ? <Text style={styles.notes}>“{params.notes}”</Text> : null}

            {blocked ? (
              <View style={styles.blockCard}>
                <Text style={styles.blockTitle}>Women-only game</Text>
                <Text style={styles.blockBody}>{gateReason}</Text>
              </View>
            ) : null}

            <View style={styles.safety}>
              <Text style={styles.safetyText}>
                Safety: meet at the public court only. Don’t share your address.
              </Text>
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={() => setShowReport(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.reportText}>Report</Text>
              </TouchableOpacity>
            </View>

            {!blocked ? (
            <>
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
              <View style={styles.rateBlock}>
                <Text style={styles.rateLabel}>
                  Trust check — not about skill. Would you play with these people again?
                </Text>
                <View style={styles.rateRow}>
                  <TouchableOpacity
                    style={styles.yesBtn}
                    onPress={() => onWouldPlayAgain(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.yesText}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noBtn}
                    onPress={() => onWouldPlayAgain(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noText}>Not really</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.rated}>
                Thanks — that only updates show-up / rematch trust, not how well they play.
              </Text>
            )}
            </>
            ) : null}
          </View>

          {members.length > 0 && !blocked ? (
            <View style={styles.players}>
              <View style={styles.playersHead}>
                <Text style={styles.playersTitle}>Players ({members.length})</Text>
                {isHost ? <Text style={styles.hostTag}>You host</Text> : null}
              </View>

              {members.length > 3 ? (
                <TextInput
                  style={styles.filterInput}
                  placeholder="Filter players by name, level…"
                  placeholderTextColor={theme.muted}
                  value={memberFilter}
                  onChangeText={setMemberFilter}
                  autoCorrect={false}
                />
              ) : null}

              <ScrollView style={styles.playersList} showsVerticalScrollIndicator={false}>
                {filteredMembers.map((m) => {
                  const confirming = confirmRemoveId === m.userId;
                  return (
                    <View key={m.userId} style={styles.playerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{m.name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.playerNameRow}>
                          <Text style={styles.playerName}>{m.name}</Text>
                          <VerifiedBadge level={m.verification} compact />
                        </View>
                        <Text style={styles.playerMeta}>
                          {m.role === 'host' ? 'Host' : m.skill ? `${m.skill}` : 'Player'}
                          {m.neighbourhood ? ` · ${m.neighbourhood}` : ''}
                        </Text>
                      </View>

                      {isHost && m.role !== 'host' ? (
                        confirming ? (
                          <View style={styles.confirmRow}>
                            <TouchableOpacity
                              style={styles.confirmBtn}
                              onPress={() => onRemoveMember(m)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.confirmText}>Remove</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() => setConfirmRemoveId(null)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.cancelText}>Keep</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => setConfirmRemoveId(m.userId)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.removeText}>Remove</Text>
                          </TouchableOpacity>
                        )
                      ) : null}
                    </View>
                  );
                })}
                {filteredMembers.length === 0 ? (
                  <Text style={styles.playersEmpty}>No players match “{memberFilter}”.</Text>
                ) : null}
              </ScrollView>
            </View>
          ) : null}

          {blocked ? (
            <View style={styles.blockedChat}>
              <Text style={styles.blockedChatText}>
                The group chat opens once you can join this game.
              </Text>
            </View>
          ) : (
            <>
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
                    <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>{m.text}</Text>
                    <Text style={[styles.at, m.mine && styles.atMine]}>{m.at}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder={isSignedIn ? 'Message the group…' : 'Demo chat — messages stay on this device'}
                  placeholderTextColor={theme.muted}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={send}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.85}>
                  <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ReportSheet
        visible={showReport}
        targetType="session"
        targetId={session.id}
        targetLabel="this game"
        onClose={() => setShowReport(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.bg },
  exitBar: { backgroundColor: theme.bg, paddingVertical: 12, paddingHorizontal: 16 },
  exitText: { color: theme.ink, fontWeight: '800', fontSize: 14 },
  info: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.ink },
  meta: { marginTop: 4, color: theme.muted, fontSize: 13 },
  recurring: { marginTop: 6, color: theme.accentBright, fontWeight: '700', fontSize: 12 },
  detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  detailChip: {
    backgroundColor: theme.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailChipText: { color: theme.accentDark, fontWeight: '700', fontSize: 12 },
  desc: { marginTop: 8, color: theme.ink, fontSize: 14, lineHeight: 20 },
  notes: {
    marginTop: 8,
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  safety: {
    marginTop: 12,
    backgroundColor: theme.accentSoft,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  safetyText: { color: theme.accentDark, fontSize: 12, lineHeight: 17, fontWeight: '600', flex: 1 },
  reportBtn: {
    borderWidth: 1,
    borderColor: theme.accentDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportText: { color: theme.accentDark, fontWeight: '800', fontSize: 12 },
  blockCard: {
    marginTop: 12,
    backgroundColor: theme.warnBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7D9AE',
  },
  blockTitle: { color: theme.warnFg, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  blockBody: { color: theme.warnFg, fontSize: 13, lineHeight: 19 },
  blockedChat: {
    padding: 16,
    alignItems: 'center',
  },
  blockedChatText: { color: theme.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retentionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  retBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: theme.accentSoft,
  },
  retBtnOn: { backgroundColor: theme.accent },
  retText: { color: theme.accent, fontWeight: '800', fontSize: 12 },
  retTextOn: { color: '#FFFFFF' },
  rateBlock: { marginTop: 12 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rateLabel: { color: theme.ink, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  yesBtn: {
    backgroundColor: theme.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yesText: { color: '#fff', fontWeight: '800' },
  noBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noText: { color: theme.muted, fontWeight: '700' },
  rated: { marginTop: 10, color: theme.muted, fontSize: 12 },
  players: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  playersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playersTitle: { fontSize: 15, fontWeight: '800', color: theme.ink },
  hostTag: {
    color: theme.accentDark,
    fontWeight: '800',
    fontSize: 11,
    backgroundColor: theme.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  filterInput: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.ink,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  playersList: { maxHeight: 220 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.accentDark, fontWeight: '800', fontSize: 15 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: { fontSize: 14, fontWeight: '700', color: theme.ink },
  playerMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
  removeBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeText: { color: '#C23B3B', fontWeight: '800', fontSize: 12 },
  confirmRow: { flexDirection: 'row', gap: 6 },
  confirmBtn: {
    backgroundColor: '#C23B3B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: { color: theme.muted, fontWeight: '800', fontSize: 12 },
  playersEmpty: { color: theme.muted, fontSize: 13, paddingVertical: 10 },
  chatLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontWeight: '700',
    color: theme.ink,
  },
  chat: { flex: 1, paddingHorizontal: 16 },
  chatContent: { paddingVertical: 8, gap: 8 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF' },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: theme.accent },
  sender: { fontSize: 11, fontWeight: '700', color: theme.accent, marginBottom: 2 },
  bubbleText: { fontSize: 15, color: theme.ink },
  bubbleTextMine: { color: '#FFFFFF' },
  at: { marginTop: 4, fontSize: 10, color: theme.muted },
  atMine: { color: theme.accentSoft, textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.ink,
  },
  sendBtn: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: { color: '#FFFFFF', fontWeight: '700' },
});
