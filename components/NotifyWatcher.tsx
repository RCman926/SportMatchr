import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { listMySessions } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import {
  ensureNotifyPermission,
  getNotifyPermission,
  showAppNotification,
  type AppNotification,
} from '../lib/notify';
import { sessionShareUrl } from '../lib/share';
import { theme } from '../constants/theme';

/**
 * Watches your games while the app is open.
 * On join / player-count bump → phone banner or desktop popup (no email).
 */
export function NotifyWatcher() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const countsRef = useRef<Record<string, number>>({});
  const primed = useRef(false);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const [askBar, setAskBar] = useState(false);

  useEffect(() => {
    if (!bootstrapped || !userId || Platform.OS !== 'web') return;
    if (getNotifyPermission() === 'default') {
      setAskBar(true);
    }
  }, [bootstrapped, userId]);

  useEffect(() => {
    if (!bootstrapped || !userId) return;

    let alive = true;

    const tick = async () => {
      const sessions = await listMySessions();
      if (!alive) return;

      for (const s of sessions) {
        const prev = countsRef.current[s.id];
        const next = s.players;
        if (!primed.current) {
          countsRef.current[s.id] = next;
          continue;
        }
        if (typeof prev === 'number' && next > prev) {
          const n: AppNotification = {
            title: 'Someone joined your game',
            body: `${s.sport} · ${s.location} · now ${next}/${s.max}`,
            url: sessionShareUrl(s.id),
            tag: `join-${s.id}-${next}`,
          };
          // System popup/banner (desktop + phone browser)
          showAppNotification(n);
          // In-page cue when you're already looking at the site
          setBanner(n);
        }
        countsRef.current[s.id] = next;
      }
      primed.current = true;
    };

    void tick();
    const interval = setInterval(() => void tick(), 12_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [bootstrapped, userId]);

  if (Platform.OS !== 'web') return null;

  return (
    <>
      {askBar && getNotifyPermission() === 'default' ? (
        <View style={styles.askBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.askTitle}>Get a ping when someone joins</Text>
            <Text style={styles.askBody}>Phone banner or desktop popup — no email.</Text>
          </View>
          <TouchableOpacity
            style={styles.askBtn}
            activeOpacity={0.85}
            onPress={async () => {
              await ensureNotifyPermission({ force: true });
              setAskBar(false);
            }}
          >
            <Text style={styles.askBtnText}>Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAskBar(false)} hitSlop={8}>
            <Text style={styles.askSkip}>Not now</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {banner ? (
        <TouchableOpacity
          style={styles.banner}
          activeOpacity={0.9}
          onPress={() => {
            if (banner.url && typeof window !== 'undefined') {
              window.location.href = banner.url;
            }
            setBanner(null);
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerBody}>{banner.body}</Text>
          </View>
          <TouchableOpacity onPress={() => setBanner(null)} hitSlop={8}>
            <Text style={styles.bannerDismiss}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  askBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 72,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.ink,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  askTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  askBody: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  askBtn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  askBtnText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  askSkip: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.ball,
    borderRadius: theme.radius.md,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  bannerBody: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  bannerDismiss: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18,
    color: '#fff',
    paddingHorizontal: 4,
  },
});
