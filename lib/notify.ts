import { Platform } from 'react-native';

const ASKED_KEY = 'sportmatchr.notifyAsked';

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function notifySupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined'
  );
}

export function getNotifyPermission(): NotifyPermission {
  if (!notifySupported()) return 'unsupported';
  return Notification.permission as NotifyPermission;
}

export function hasAskedNotify(): boolean {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
}

function markAsked() {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Ask once for browser/phone notifications (desktop popup + Android Chrome). */
export async function ensureNotifyPermission(opts?: {
  force?: boolean;
}): Promise<NotifyPermission> {
  if (!notifySupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  if (!opts?.force && hasAskedNotify()) return 'default';

  markAsked();
  try {
    const result = await Notification.requestPermission();
    return result as NotifyPermission;
  } catch {
    return 'denied';
  }
}

export type AppNotification = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Phone/desktop system notification.
 * Works when permission granted — desktop popup, Android Chrome banner.
 * iPhone: works best after Add to Home Screen (Safari web push).
 */
export function showAppNotification(n: AppNotification): boolean {
  if (!notifySupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const note = new Notification(n.title, {
      body: n.body,
      tag: n.tag ?? 'sportmatchr',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
    note.onclick = () => {
      try {
        window.focus();
        if (n.url) window.location.href = n.url;
      } catch {
        /* ignore */
      }
      note.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Prefer system notify; fall back to in-page banner callback. */
export function pingUser(
  n: AppNotification,
  fallback?: (n: AppNotification) => void
): void {
  const shown = showAppNotification(n);
  if (!shown && fallback) fallback(n);
}
