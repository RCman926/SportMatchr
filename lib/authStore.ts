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

async function readFounderFlag(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('founder') === '1' || q.get('admin') === '1') {
        await AsyncStorage.setItem(FOUNDER_KEY, '1');
        // Clean query so refresh stays clean
        q.delete('founder');
        q.delete('admin');
        const next = `${window.location.pathname}${q.toString() ? `?${q}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, next);
        return true;
      }
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

    // Web magic-link: exchange tokens from URL hash/query
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const href = window.location.href;
      if (href.includes('access_token') || href.includes('type=magiclink') || href.includes('code=')) {
        try {
          await supabase.auth.exchangeCodeForSession(href).catch(async () => {
            const hash = window.location.hash?.replace(/^#/, '') ?? '';
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase!.auth.setSession({ access_token, refresh_token });
            }
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          /* continue with getSession */
        }
      }
    }

    const { data } = await supabase.auth.getSession();
    const signedIn = Boolean(data.session?.user);
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
      const preview = get().isFounderPreview;
      set({
        session,
        user: session?.user ?? null,
        isSignedIn: nextSignedIn,
        canAct: computeCanAct(nextSignedIn, preview),
        loading: false,
      });
    });
  },

  enterFounderPreview: async () => {
    await AsyncStorage.setItem(FOUNDER_KEY, '1');
    const signedIn = get().isSignedIn;
    set({
      isFounderPreview: true,
      canAct: computeCanAct(signedIn, true),
    });
  },

  exitFounderPreview: async () => {
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
