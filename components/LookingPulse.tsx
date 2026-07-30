import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { countLookingNow, countOnlineNow } from '../lib/api';
import { theme } from '../constants/theme';
import { WEDGE } from '../constants/wedge';

type Props = {
  /** Jump to Solos when tapped */
  linkToSolos?: boolean;
};

export function LookingPulse({ linkToSolos = true }: Props) {
  const [online, setOnline] = useState<number | null>(null);
  const [looking, setLooking] = useState<number | null>(null);
  const [source, setSource] = useState<'live' | 'demo'>('demo');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const refresh = async () => {
        const [on, look] = await Promise.all([countOnlineNow(), countLookingNow()]);
        if (!alive) return;
        setOnline(on.count);
        setLooking(look.count);
        setSource(on.source);
      };
      void refresh();
      const t = setInterval(() => void refresh(), 15000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, [])
  );

  const onlineLabel =
    online === null
      ? 'Checking who’s around…'
      : online <= 1
        ? 'You’re in the app right now'
        : `${online} people in the app right now`;

  const lookingLabel =
    looking === null
      ? ''
      : looking === 0
        ? `Nobody flagged “looking” yet in ${WEDGE.pocketName}`
        : looking === 1
          ? '1 of them is looking for a game'
          : `${looking} of them are looking for a game`;

  const body = (
    <View style={styles.wrap}>
      <View style={[styles.dot, online && online > 0 ? styles.dotOn : null]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{onlineLabel}</Text>
        {lookingLabel ? <Text style={styles.sub}>{lookingLabel}</Text> : null}
        {source !== 'live' ? (
          <Text style={styles.hint}>Sample numbers until the live pulse connects</Text>
        ) : (
          <Text style={styles.hint}>Open Now for Online · Looking · Games</Text>
        )}
      </View>
      {linkToSolos ? <Text style={styles.cta}>Now →</Text> : null}
    </View>
  );

  if (!linkToSolos) return body;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/solos')}>
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.border,
  },
  dotOn: {
    backgroundColor: theme.accentBright,
  },
  title: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ink,
    fontSize: 15,
  },
  sub: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.accentDark,
    fontSize: 13,
    marginTop: 2,
  },
  hint: {
    fontFamily: theme.fonts.body,
    color: theme.muted,
    fontSize: 11,
    marginTop: 3,
  },
  cta: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accent,
    fontSize: 13,
  },
});
