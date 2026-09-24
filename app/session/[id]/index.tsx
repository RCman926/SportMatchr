import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
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
  Keyboard,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatMessage } from '../../../constants/mockData';
import {
  cancelSession,
  cloneNextWeek,
  getSessionById,
  joinSession,
  leaveSession,
  listMessages,
  listSessionMembers,
  markHere,
  reportUser,
  sendMessage,
  submitFeedback,
  subscribeMessages,
  LiveSession,
} from '../../../lib/api';
import { useAuthStore } from '../../../lib/authStore';
import { theme } from '../../../constants/theme';
import { KeyboardChatShell } from '../../../components/KeyboardChatShell';
import { ResultPicker } from '../../../components/ResultPicker';
import { ShareInvite } from '../../../components/ShareInvite';
import { SessionWhoTags } from '../../../components/SessionWhoTags';
import { SafetyGate } from '../../../components/SafetyGate';
import { SportScene } from '../../../components/SportScene';
import { ensureNotifyPermission, showAppNotification } from '../../../lib/notify';
import { sessionShareUrl } from '../../../lib/share';
import { goToAuth } from '../../../lib/pendingAuth';
import { FEMALE_ONLY_JOIN_TIP } from '../../../lib/sessionFilters';

function goBackToApp() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/home');
}

function focusComposer(ref: RefObject<TextInput | null>) {
  if (Platform.OS !== 'web') return;
  // Avoid scrollIntoView — it fights the fixed viewport pin and can hide the field.
  requestAnimationFrame(() => {
    try {
      (ref.current as unknown as HTMLElement | null)?.focus?.();
    } catch {
      /* ignore */
    }
  });
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

  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const canAct = useAuthStore((s) => s.canAct);
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const chatRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [here, setHere] = useState(false);
  const [rated, setRated] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  /** Invite links land on chat first — details / after-game stay collapsed */
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [afterGameOpen, setAfterGameOpen] = useState(false);
  const [femaleGate, setFemaleGate] = useState(false);
  const [femaleOk, setFemaleOk] = useState(false);

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

  useEffect(() => {
    setFemaleOk(false);
    setFemaleGate(false);
  }, [params.id]);

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | undefined;

    (async () => {
      const realId =
        isSignedIn &&
        params.id &&
        !params.id.startsWith('solo-') &&
        !params.id.startsWith('mock-');

      if (realId) {
        const s = await getSessionById(params.id);
        if (alive && s) setLiveSession(s);

        const members = await listSessionMembers(params.id);
        const already = Boolean(user?.id && members.some((m) => m.userId === user.id));
        if (s?.playMix === 'female_only' && !already && !femaleOk) {
          if (alive) setFemaleGate(true);
          return;
        }

        await joinSession(params.id);
        const next = await getSessionById(params.id);
        if (alive && next) setLiveSession(next);
        void ensureNotifyPermission({ force: true });
      }

      const msgs = await listMessages(params.id ?? 'solo', { live: isSignedIn });
      if (alive) setMessages(msgs);

      if (isSignedIn && params.id) {
        unsub = subscribeMessages(params.id, (msg) => {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (!msg.mine) {
            const hidden =
              typeof document !== 'undefined' && document.visibilityState === 'hidden';
            if (hidden || Platform.OS !== 'web') {
              showAppNotification({
                title: `${msg.sender} in chat`,
                body: msg.text,
                url: sessionShareUrl(params.id!),
                tag: `msg-${msg.id}`,
              });
            }
          }
        });
      }
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, [params.id, isSignedIn, user?.id, femaleOk]);

  const scrollChatEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const onKeyboardChange = useCallback(
    (open: boolean) => {
      setKeyboardOpen(open);
      if (open) {
        setDetailsOpen(false);
        scrollChatEnd();
        setTimeout(scrollChatEnd, 120);
        setTimeout(scrollChatEnd, 320);
      }
    },
    [scrollChatEnd]
  );

  useEffect(() => {
    scrollChatEnd();
  }, [messages.length, scrollChatEnd]);

  // Native keyboard listeners (shell is web-only pin)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardOpen(true);
        setDetailsOpen(false);
        setTimeout(scrollChatEnd, 80);
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollChatEnd]);

  const needAuth = () => {
    if (params.id) goToAuth({ kind: 'join', id: params.id });
    else router.push('/auth');
  };

  const send = async () => {
    if (!canAct) {
      needAuth();
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const msg = await sendMessage(params.id ?? 'solo', text);
    if (!msg) {
      if (!isSignedIn) {
        Alert.alert('Sign in required', 'Create a free account to chat with the group.');
        needAuth();
        return;
      }
      Alert.alert('Message not sent', 'Try again in a moment.');
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    scrollChatEnd();
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
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
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const ok = await submitFeedback({
      sessionId: session.id,
      wouldPlayAgain: yes,
      wantRematch: yes,
      showedUp: true,
    });
    if (!ok) {
      Alert.alert('Could not save', 'Sign in and try again.');
      return;
    }
    setRated(true);
  };

  const onRematch = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const ok = await submitFeedback({
      sessionId: session.id,
      wantRematch: true,
      wouldPlayAgain: true,
    });
    if (!ok) {
      Alert.alert('Could not save', 'Sign in and try again.');
      return;
    }
    Alert.alert('Rematch flagged', 'Same crew — ask the host or create a follow-up.');
  };

  const onLeave = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const ok = await leaveSession(session.id);
    if (!ok) {
      Alert.alert('Could not leave', 'Hosts should cancel the session instead.');
      return;
    }
    Alert.alert('Left session');
    goBackToApp();
  };

  const onCancel = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const ok = await cancelSession(session.id);
    if (!ok) {
      Alert.alert('Could not cancel', 'Only the host can cancel.');
      return;
    }
    Alert.alert('Session cancelled');
    goBackToApp();
  };

  const onReport = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    const res = await reportUser({
      sessionId: session.id.startsWith('mock-') ? null : session.id,
      reportedUserId: session.hostId !== 'me' && session.hostId !== user?.id ? session.hostId : null,
      reason: 'Safety concern from session chat',
    });
    if (!res.ok) {
      Alert.alert('Report failed', res.error ?? 'Try again');
      return;
    }
    Alert.alert('Report submitted', 'Thanks — we’ll review this.');
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

  const showDetails = detailsOpen && !keyboardOpen;
  const hasCrew = session.players >= 2;
  const shareable = {
    id: session.id,
    sport: session.sport,
    title: session.title,
    location: session.location,
    time: session.time,
  };

  const body = (
    <View style={styles.fill}>
      <View style={[styles.info, keyboardOpen && styles.infoCompact]}>
        {!keyboardOpen ? <SportScene sport={session.sport} height={96} /> : null}
        <View style={styles.infoPad}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {session.title}
          </Text>
        </View>
        {!keyboardOpen ? (
          <Text style={styles.meta} numberOfLines={1}>
            {session.time} · {session.location} · {session.players}/{session.max}
          </Text>
        ) : (
          <Text style={styles.metaCompact}>Type below · chat scrolls up with keyboard</Text>
        )}
        {!keyboardOpen ? (
          <SessionWhoTags
            playMix={liveSession?.playMix}
            ageGroup={liveSession?.ageGroup}
            skillLevel={liveSession?.skillLevel}
          />
        ) : null}

        {!keyboardOpen &&
        isSignedIn &&
        user?.id &&
        (liveSession?.hostId === user.id || session.hostId === user.id) ? (
          <TouchableOpacity
            style={styles.editLink}
            activeOpacity={0.85}
            onPress={() => router.push(`/session/${session.id}/edit`)}
          >
            <Text style={styles.editLinkText}>Edit sport, place, date, or host →</Text>
          </TouchableOpacity>
        ) : null}

        {!keyboardOpen ? (
          <ShareInvite session={shareable} alone={!hasCrew} />
        ) : null}

        {showDetails ? (
          <>
            {session.recurring ? <Text style={styles.recurring}>↻ {session.recurring}</Text> : null}
            {session.description ? <Text style={styles.desc}>{session.description}</Text> : null}
            <View style={styles.safety}>
              <Text style={styles.safetyText}>
                Safety: meet at the public place only. Don’t share your address.
              </Text>
            </View>

            {isSignedIn &&
            user?.id &&
            (liveSession?.hostId === user.id || session.hostId === user.id) ? (
              <TouchableOpacity
                style={styles.editGameBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/session/${session.id}/edit`)}
              >
                <Text style={styles.editGameBtnText}>Edit game · sport, place, host</Text>
              </TouchableOpacity>
            ) : null}

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
              {isSignedIn && liveSession && user?.id === liveSession.hostId ? (
                <TouchableOpacity style={styles.retBtn} onPress={onCancel} activeOpacity={0.85}>
                  <Text style={styles.retText}>Cancel game</Text>
                </TouchableOpacity>
              ) : isSignedIn && !session.id.startsWith('mock-') ? (
                <TouchableOpacity style={styles.retBtn} onPress={onLeave} activeOpacity={0.85}>
                  <Text style={styles.retText}>Leave</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.retBtn} onPress={onReport} activeOpacity={0.85}>
                <Text style={styles.retText}>Report</Text>
              </TouchableOpacity>
            </View>

            {hasCrew ? (
              <>
                <TouchableOpacity
                  onPress={() => setAfterGameOpen((v) => !v)}
                  style={styles.collapseBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.collapseText}>
                    {afterGameOpen
                      ? 'Hide after-game (trust · W/L/D · rematch)'
                      : 'After the game · trust, score, rematch'}
                  </Text>
                </TouchableOpacity>
                {afterGameOpen ? (
                  <>
                    <Text style={styles.afterHint}>
                      Use this after you play — not while you’re still planning in chat.
                    </Text>
                    <View style={styles.retentionRow}>
                      <TouchableOpacity style={styles.retBtn} onPress={onRematch} activeOpacity={0.85}>
                        <Text style={styles.retText}>Rematch</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.retBtn}
                        onPress={onNextWeek}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.retText}>Next week</Text>
                      </TouchableOpacity>
                    </View>

                    {!rated ? (
                      <View style={styles.rateBlock}>
                        <Text style={styles.rateLabel}>
                          Trust check — would you play with these people again?
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
                      <Text style={styles.rated}>Thanks — show-up / rematch trust updated.</Text>
                    )}

                    <ResultPicker
                      sessionId={session.id}
                      sport={session.sport}
                      canAct={isSignedIn}
                      onNeedAuth={needAuth}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <TouchableOpacity onPress={() => setDetailsOpen(false)} style={styles.collapseBtn}>
              <Text style={styles.collapseText}>Hide details · more chat room</Text>
            </TouchableOpacity>
          </>
        ) : !keyboardOpen ? (
          <TouchableOpacity onPress={() => setDetailsOpen(true)} style={styles.collapseBtn}>
            <Text style={styles.collapseText}>Show game details</Text>
          </TouchableOpacity>
        ) : null}
        </View>
      </View>

      {!keyboardOpen ? <Text style={styles.chatLabel}>Group chat</Text> : null}

      <ScrollView
        ref={chatRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        onContentSizeChange={scrollChatEnd}
      >
        {messages.length === 0 ? (
          <Text style={styles.emptyChat}>
            Say when you’re heading over — keep the plan at the public place.
          </Text>
        ) : null}
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

      <View
        style={[
          styles.composer,
          { paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 8) },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={
            canAct ? 'Message the group…' : 'Sign up free to chat with the group…'
          }
          placeholderTextColor="#94A3B8"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
          onFocus={() => {
            setDetailsOpen(false);
            setKeyboardOpen(true);
            scrollChatEnd();
            focusComposer(inputRef);
            setTimeout(scrollChatEnd, 200);
          }}
          onBlur={() => {
            // Delay — iOS fires blur between Send taps
            setTimeout(() => {
              if (Platform.OS === 'web' && document.activeElement?.tagName === 'INPUT') return;
              setKeyboardOpen(false);
            }, 80);
          }}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.85}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: !keyboardOpen,
          title: session.sport,
          headerLeft: () => (
            <TouchableOpacity onPress={goBackToApp} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: theme.ball, fontWeight: '800', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {Platform.OS === 'web' ? (
        <KeyboardChatShell onKeyboardChange={onKeyboardChange}>{body}</KeyboardChatShell>
      ) : (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <View style={styles.fill}>{body}</View>
        </KeyboardAvoidingView>
      )}

      <SafetyGate
        visible={femaleGate}
        title="Female only game"
        extraTips={[FEMALE_ONLY_JOIN_TIP]}
        confirmLabel="Yes — I’m in"
        onCancel={() => {
          setFemaleGate(false);
          goBackToApp();
        }}
        onConfirm={() => {
          setFemaleGate(false);
          setFemaleOk(true);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  exitBar: {
    backgroundColor: theme.bg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  exitText: { color: theme.ink, fontWeight: '800', fontSize: 14 },
  info: {
    backgroundColor: theme.surface,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexShrink: 0,
    overflow: 'hidden',
  },
  infoPad: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  infoCompact: { paddingTop: 6, paddingBottom: 6 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: theme.ink },
  meta: { marginTop: 4, color: theme.muted, fontSize: 13 },
  metaCompact: {
    marginTop: 2,
    color: theme.mutedSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  recurring: { marginTop: 6, color: theme.accent, fontWeight: '700', fontSize: 12 },
  desc: { marginTop: 8, color: theme.ink, fontSize: 14, lineHeight: 20 },
  safety: {
    marginTop: 10,
    backgroundColor: theme.accentSoft,
    borderRadius: 10,
    padding: 10,
  },
  safetyText: { color: theme.accentDark, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  editLink: {
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  editLinkText: {
    color: theme.ballDark,
    fontWeight: '800',
    fontSize: 13,
  },
  editGameBtn: {
    marginTop: 12,
    backgroundColor: theme.ballSoft,
    borderWidth: 1.5,
    borderColor: theme.ballDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editGameBtnText: {
    color: theme.ballDark,
    fontWeight: '800',
    fontSize: 14,
  },
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
  retBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  retText: { color: theme.accentDark, fontWeight: '800', fontSize: 12 },
  retTextOn: { color: '#FFFFFF' },
  rateBlock: { marginTop: 12 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rateLabel: { color: theme.ink, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  yesBtn: {
    backgroundColor: theme.ball,
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
  collapseBtn: { marginTop: 8, paddingVertical: 4 },
  collapseText: { color: theme.ballDark, fontWeight: '700', fontSize: 12 },
  afterHint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 4,
  },
  chatLabel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    fontWeight: '700',
    color: theme.ink,
    flexShrink: 0,
  },
  chat: { flex: 1, minHeight: 0, paddingHorizontal: 16 },
  chatContent: {
    paddingVertical: 8,
    gap: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyChat: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: theme.surface },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: theme.ball },
  sender: { fontSize: 11, fontWeight: '700', color: theme.ballDark, marginBottom: 2 },
  bubbleText: { fontSize: 15, color: theme.ink },
  bubbleTextMine: { color: '#FFFFFF' },
  at: { marginTop: 4, fontSize: 10, color: theme.muted },
  atMine: { color: theme.ballSoft, textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surfaceRaised,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.ink,
    minHeight: 48,
  },
  sendBtn: {
    backgroundColor: theme.ball,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 48,
  },
  sendText: { color: '#FFFFFF', fontWeight: '700' },
});
