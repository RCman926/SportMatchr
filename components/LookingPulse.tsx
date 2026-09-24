import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { countLookingNow, countOnlineNow } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { theme, softShadow } from '../constants/theme';
import { PressScale, PulseDot, enterUp } from './motion';
import Animated from 'react-native-reanimated';

type Props = {
  /** Jump to Solos when tapped */
  linkToSolos?: boolean;
};

export function LookingPulse({ linkToSolos = true }: Props) {
  const [online, setOnline] = useState<number | null>(null);
  const [looking, setLooking] = useState<number | null>(null);
  const canAct = useAuthStore((s) => s.canAct);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const refresh = async () => {
        const [on, look] = await Promise.all([countOnlineNow(), countLookingNow()]);
        if (!alive) return;
        setOnline(on.count);
        setLooking(look.count);
      };
      void refresh();
      const t = setInterval(() => void refresh(), 15000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, [])
  );

  const hot = Boolean(looking && looking > 0);

  const readyLabel =
    looking === null
      ? 'Checking ready…'
      : looking === 0
        ? canAct
          ? 'Be first to say you’re ready'
          : 'Ready board is open'
        : looking === 1
          ? '1 ready now'
          : `${looking} ready now`;

  const onlineLabel =
    online === null
      ? 'Checking online…'
      : online < 5
        ? 'People browsing now'
        : `${online} online`;

  const body = (
    <Animated.View entering={enterUp(80)} style={[styles.wrap, softShadow, hot && styles.wrapHot]}>
      <View style={styles.rows}>
        <View style={styles.readyRow}>
          <PulseDot color={theme.accentBright} />
          <Text style={styles.readyText}>{readyLabel}</Text>
        </View>
        <View style={styles.onlineRow}>
          <PulseDot color={theme.mutedSoft} />
          <Text style={styles.onlineText}>{onlineLabel}</Text>
        </View>
      </View>
      {linkToSolos ? (
        <Text style={styles.cta}>{hot ? 'Looking' : 'Hangout'}</Text>
      ) : null}
    </Animated.View>
  );

  if (!linkToSolos) return body;

  return (
    <PressScale
      accessibilityLabel={hot ? 'Open Looking' : 'Open Hangout'}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/solos',
          params: { view: hot ? 'looking' : 'hangout' },
        })
      }
    >
      {body}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.accent,
    backgroundColor: theme.surfaceRaised,
    flexShrink: 0,
  },
  wrapHot: {
    borderColor: theme.accentBright,
    backgroundColor: theme.accentSoft,
  },
  rows: { flex: 1, gap: 6 },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.accentSoft,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.bgDeep,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  readyText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.accentDark,
    fontSize: 15,
    flex: 1,
  },
  onlineText: {
    fontFamily: theme.fonts.bodyMed,
    color: theme.muted,
    fontSize: 14,
    flex: 1,
  },
  cta: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.ball,
    fontSize: 13,
  },
});
