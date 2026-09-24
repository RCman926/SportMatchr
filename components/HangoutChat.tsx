import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { ChatMessage } from '../constants/mockData';
import { fetchMyProfile, listMessages, sendMessage, subscribeMessages } from '../lib/api';
import { HANGOUT_PROMPTS, HANGOUT_THREAD_ID } from '../lib/hangout';
import { useAuthStore } from '../lib/authStore';
import { theme } from '../constants/theme';
import { ProfileAvatar } from './ProfileAvatar';
import { PressScale, enterUp } from './motion';
import Animated from 'react-native-reanimated';

type Props = {
  area: string;
};

export function HangoutChat({ area }: Props) {
  const canAct = useAuthStore((s) => s.canAct);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | undefined>();
  const chatRef = useRef<ScrollView>(null);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let alive = true;
    let unsub: (() => void) | undefined;

    (async () => {
      setLoading(true);
      const [msgs, me] = await Promise.all([
        listMessages(HANGOUT_THREAD_ID, { live: true }),
        fetchMyProfile(),
      ]);
      if (!alive) return;
      setMyAvatar(me?.avatarUrl);
      setMessages(msgs);
      setLoading(false);
      scrollEnd();

      unsub = subscribeMessages(HANGOUT_THREAD_ID, (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      });
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, [isSignedIn, scrollEnd]);

  useEffect(() => {
    scrollEnd();
  }, [messages.length, scrollEnd]);

  const send = async (text?: string) => {
    if (!canAct || !isSignedIn) {
      router.push('/auth');
      return;
    }
    const body = (text ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    const msg = await sendMessage(HANGOUT_THREAD_ID, body.slice(0, 500));
    setSending(false);
    if (!msg) return;
    const withAvatar = { ...msg, avatarUrl: msg.avatarUrl ?? myAvatar };
    setMessages((prev) =>
      prev.some((m) => m.id === withAvatar.id) ? prev : [...prev, withAvatar]
    );
    scrollEnd();
  };

  if (!isSignedIn) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.intro}>
          Ottawa hangout — members talk sport, place, or just who’s around near {area}. Chat is
          private to signed-in players.
        </Text>
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Sign in to join Hangout</Text>
          <Text style={styles.lockedBody}>
            Messages stay among people with accounts — guests can’t read or post.
          </Text>
          <PressScale
            style={styles.signUpBar}
            accessibilityLabel="Sign up free"
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signUpText}>Sign up free</Text>
          </PressScale>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Text style={styles.intro}>
        Ottawa hangout — talk sport, place, or just who’s around near {area}. No need to host
        yet.
      </Text>

      <View style={styles.quickRow}>
        {HANGOUT_PROMPTS.map((p) => (
          <TouchableOpacity
            key={p}
            style={styles.quickChip}
            activeOpacity={0.85}
            onPress={() => void send(p)}
          >
            <Text style={styles.quickChipText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({ pathname: '/(tabs)/solos', params: { view: 'looking' } })
          }
        >
          <Text style={styles.actionText}>I’m free</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnHost]}
          activeOpacity={0.85}
          onPress={() => router.push('/create')}
        >
          <Text style={[styles.actionText, styles.actionTextHost]}>Host a game</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 24 }} />
      ) : (
        <ScrollView
          ref={chatRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <Text style={styles.empty}>
              Quiet so far — say what you’re in the mood for. Friends show up when someone starts
              talking.
            </Text>
          ) : (
            messages.map((m) => (
              <Animated.View
                key={m.id}
                entering={enterUp(0)}
                style={[styles.msgRow, m.mine && styles.msgRowMine]}
              >
                {!m.mine ? (
                  <ProfileAvatar name={m.sender} uri={m.avatarUrl} size={28} />
                ) : null}
                <View style={[styles.bubble, m.mine && styles.bubbleMine]}>
                  {!m.mine ? <Text style={styles.sender}>{m.sender}</Text> : null}
                  <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>{m.text}</Text>
                  <Text style={[styles.at, m.mine && styles.atMine]}>{m.at}</Text>
                </View>
                {m.mine ? (
                  <ProfileAvatar name={m.sender} uri={m.avatarUrl} size={28} />
                ) : null}
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="What’s the vibe — sport, place, time…"
          placeholderTextColor={theme.mutedSoft}
          maxLength={500}
          multiline
          onSubmitEditing={() => void send()}
        />
        <PressScale
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
          disabled={!draft.trim() || sending}
          onPress={() => void send()}
          accessibilityLabel="Send"
        >
          <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
        </PressScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 420,
  },
  intro: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quickChipText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    color: theme.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.surfaceRaised,
  },
  actionBtnHost: {
    backgroundColor: theme.ball,
    borderColor: theme.ballDark,
  },
  actionText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.accentDark,
  },
  actionTextHost: {
    color: '#fff',
  },
  chat: {
    flex: 1,
    minHeight: 220,
    maxHeight: 360,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.md,
  },
  chatContent: {
    padding: 12,
    paddingBottom: 16,
    gap: 8,
  },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
    paddingVertical: 20,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '94%',
  },
  msgRowMine: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
  },
  bubble: {
    flexShrink: 1,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleMine: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  sender: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    color: theme.accentDark,
    marginBottom: 2,
  },
  bubbleText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.ink,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: theme.ink,
  },
  at: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.mutedSoft,
    marginTop: 4,
  },
  atMine: {
    textAlign: 'right',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.ink,
  },
  sendBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendBtnOff: {
    opacity: 0.45,
  },
  sendText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  signUpBar: {
    marginTop: 14,
    backgroundColor: theme.ball,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signUpText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  lockedBox: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.md,
    padding: 18,
  },
  lockedTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 22,
    color: theme.ink,
    marginBottom: 6,
  },
  lockedBody: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
  },
});
