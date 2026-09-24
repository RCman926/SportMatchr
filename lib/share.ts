import { Platform, Share } from 'react-native';

export type ShareableSession = {
  id: string;
  sport: string;
  title: string;
  location: string;
  time: string;
};

export function sessionShareUrl(id: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/session/${id}`;
  }
  return `https://sportmatchr.pages.dev/session/${id}`;
}

export function sessionShareText(s: ShareableSession): string {
  const url = sessionShareUrl(s.id);
  return `${s.sport} · ${s.location} · ${s.time}\n${s.title}\n\nJoin on SportMatchr:\n${url}`;
}

/** Native share sheet, or clipboard copy on desktop web. */
export async function shareSession(
  s: ShareableSession
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = sessionShareUrl(s.id);
  const message = sessionShareText(s);

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: { writeText: (t: string) => Promise<void> };
      };
      if (typeof nav.share === 'function') {
        try {
          await nav.share({ title: s.title, text: message, url });
          return 'shared';
        } catch (e) {
          const name = e instanceof Error ? e.name : '';
          if (name === 'AbortError') return 'cancelled';
        }
      }
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(message);
        return 'copied';
      }
      return 'failed';
    }

    const result = await Share.share(
      Platform.OS === 'ios' ? { message, url } : { message, title: s.title }
    );
    if (result.action === Share.sharedAction) return 'shared';
    if (result.action === Share.dismissedAction) return 'cancelled';
    return 'shared';
  } catch {
    return 'failed';
  }
}

export function lookingShareText(): string {
  const url =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/solos?view=looking`
      : 'https://sportmatchr.pages.dev/solos?view=looking';
  return `I’m free for a game on SportMatchr — who’s around?\n${url}`;
}

export async function shareLookingBlurb(): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const message = lookingShareText();
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: { writeText: (t: string) => Promise<void> };
      };
      if (typeof nav.share === 'function') {
        try {
          await nav.share({ title: 'SportMatchr', text: message });
          return 'shared';
        } catch (e) {
          const name = e instanceof Error ? e.name : '';
          if (name === 'AbortError') return 'cancelled';
        }
      }
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(message);
        return 'copied';
      }
    }
    await Share.share({ message });
    return 'shared';
  } catch {
    return 'failed';
  }
}
