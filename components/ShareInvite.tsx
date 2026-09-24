import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { shareSession, ShareableSession } from '../lib/share';
import { theme } from '../constants/theme';

type Props = {
  session: ShareableSession;
  /** Emphasize when you're alone waiting */
  alone?: boolean;
};

export function ShareInvite({ session, alone = false }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <View style={[styles.wrap, alone && styles.wrapAlone]}>
      <Text style={styles.title}>
        {alone ? 'You’re the only one here' : 'Pull friends in'}
      </Text>
      <Text style={styles.body}>
        Text them this game — WhatsApp, iMessage, whatever you use.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        onPress={async () => {
          const result = await shareSession(session);
          if (result === 'copied') {
            setStatus('Link copied — paste it in a chat');
          } else if (result === 'shared') {
            setStatus('Shared');
          } else if (result === 'failed') {
            setStatus('Couldn’t share — copy the URL from the address bar');
          } else {
            setStatus(null);
          }
        }}
      >
        <Text style={styles.btnText}>
          {Platform.OS === 'web' ? 'Copy invite link' : 'Share invite'}
        </Text>
      </TouchableOpacity>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
  },
  wrapAlone: {
    backgroundColor: theme.ballSoft,
    borderColor: theme.ballDark,
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  status: {
    marginTop: 8,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.accentDark,
  },
});
