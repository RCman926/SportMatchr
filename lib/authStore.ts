import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

const FOUNDER_KEY = 'sportmatchr.founderPreview';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  bootstrapped: boolean;
  /** Real Supabase session */
  isSignedIn: boolean;
  /** Local founder unlock — full UI on demo data, no account */
  isFounderPreview: boolean;
  /** Signed in OR founder preview — use for navigation / feature gates */
  canAct: boolean;
  bootstrap: () => Promise<void>;
  enterFounderPreview: () => Promise<void>;
  exitFounderPreview: () => Promise<void>;
  signOut: () => Promise<void>;
};

function computeCanAct(isSignedIn: boolean, isFounderPreview: boolean) {
  return isSignedIn || isFounderPreview;
}

/**
 * Demo/mock board only for founder preview WITHOUT a real account.
 * Friends on the public URL always see the live product (empty until people join).
 */
export function shouldUseDemoData(): boolean {
  const { isFounderPreview, isSignedIn } = useAuthStore.getState();
  return isFounderPreview && !isSignedIn;
}

/**
 * Founder/mock preview:
 * - Web: only when ?founder=1 (or ?admin=1). Stored in sessionStorage so THIS TAB
 *   keeps mock for the demo, but a fresh tab / friends on the clean URL always get live.
 * - ?founder=0 / ?live=1 clears any leftover localStorage sticky flag from older builds.
 */
async function readFounderFlag(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      const clear =
        q.get('founder') === '0' || q.get('live') === '1' || q.get('founder') === 'false';
      const enable = q.get('founder') === '1' || q.get('admin') === '1';

      if (clear || enable) {
        q.delete('founder');
        q.delete('admin');
        q.delete('live');
        const next = `${window.location.pathname}${q.toString() ? `?${q}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, next);
      }

      if (clear) {
        try {
          sessionStorage.removeItem(FOUNDER_KEY);
          localStorage.removeItem(FOUNDER_KEY);
        } catch {
          /* ignore */
        }
        await AsyncStorage.removeItem(FOUNDER_KEY);
        return false;
      }

      if (enable) {
        try {
          sessionStorage.setItem(FOUNDER_KEY, '1');
        } catch {
          /* ignore */
        }
        // Clear legacy sticky flag so /home without ?founder=1 never stays on mock forever
        try {
          localStorage.removeItem(FOUNDER_KEY);
        } catch {
          /* ignore */
        }
        await AsyncStorage.removeItem(FOUNDER_KEY);
        return true;
      }

      // Tab-scoped only — never restore from AsyncStorage/localStorage on web
      try {
        if (sessionStorage.getItem(FOUNDER_KEY) === '1') return true;
      } catch {
        /* ignore */
      }
      // One-time migration: drop old sticky localStorage so shared URL is live
      try {
        if (localStorage.getItem(FOUNDER_KEY) === '1') {
          localStorage.removeItem(FOUNDER_KEY);
        }
      } catch {
        /* ignore */
      }
      await AsyncStorage.removeItem(FOUNDER_KEY);
      return false;
    }

    return (await AsyncStorage.getItem(FOUNDER_KEY)) === '1';
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  bootstrapped: false,
  isSignedIn: false,
  isFounderPreview: false,
  canAct: false,

  bootstrap: async () => {
    const founder = await readFounderFlag();

    if (!supabase) {
      set({
        loading: false,
        bootstrapped: true,
        user: null,
        session: null,
        isSignedIn: false,
        isFounderPreview: founder,
        canAct: computeCanAct(false, founder),
      });
      return;
    }

    // Web: email confirm / magic-link / OAuth — exchange tokens from URL hash/query
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const href = window.location.href;
      const hash = window.location.hash?.replace(/^#/, '') ?? '';
      const query = window.location.search?.replace(/^\?/, '') ?? '';
      const urlParams = new URLSearchParams(hash || query);
      const authType = urlParams.get('type');
      const isRecovery = authType === 'recovery';
      const hasAuthCallback =
        href.includes('access_token') ||
        href.includes('refresh_token') ||
        href.includes('type=magiclink') ||
        href.includes('type=signup') ||
        href.includes('type=email') ||
        href.includes('type=recovery') ||
        href.includes('code=');
      if (hasAuthCallback) {
        try {
          await supabase.auth.exchangeCodeForSession(href).catch(async () => {
            const access_token = urlParams.get('access_token');
            const refresh_token = urlParams.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase!.auth.setSession({ access_token, refresh_token });
            }
          });
          const path = (window.location.pathname || '/auth').split('?')[0];
          const next = isRecovery ? `${path}?recovery=1` : path;
          window.history.replaceState({}, document.title, next);
        } catch {
          /* continue with getSession */
        }
      }
    }

    const { data } = await supabase.auth.getSession();
    const signedIn = Boolean(data.session?.user);
    // Keep founder flag across sign-in for ops UI (seed). Demo data still off when signed in
    // via shouldUseDemoData() = founder && !signedIn.
    set({
      session: data.session,
      user: data.session?.user ?? null,
      isSignedIn: signedIn,
      isFounderPreview: founder,
      canAct: computeCanAct(signedIn, founder),
      loading: false,
      bootstrapped: true,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const nextSignedIn = Boolean(session?.user);
      set({
        session,
        user: session?.user ?? null,
        isSignedIn: nextSignedIn,
        isFounderPreview: get().isFounderPreview,
        canAct: computeCanAct(nextSignedIn, get().isFounderPreview),
        loading: false,
      });
    });
  },

  enterFounderPreview: async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(FOUNDER_KEY, '1');
        localStorage.removeItem(FOUNDER_KEY);
      } catch {
        /* ignore */
      }
    } else {
      await AsyncStorage.setItem(FOUNDER_KEY, '1');
    }
    const signedIn = get().isSignedIn;
    set({
      isFounderPreview: true,
      canAct: computeCanAct(signedIn, true),
    });
  },

  exitFounderPreview: async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(FOUNDER_KEY);
        localStorage.removeItem(FOUNDER_KEY);
      } catch {
        /* ignore */
      }
    }
    await AsyncStorage.removeItem(FOUNDER_KEY);
    const signedIn = get().isSignedIn;
    set({
      isFounderPreview: false,
      canAct: computeCanAct(signedIn, false),
    });
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    const preview = get().isFounderPreview;
    set({
      user: null,
      session: null,
      isSignedIn: false,
      canAct: computeCanAct(false, preview),
    });
  },
}));

export { isSupabaseConfigured };
