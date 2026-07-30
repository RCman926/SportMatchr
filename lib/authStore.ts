import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  bootstrapped: boolean;
  bootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
  isSignedIn: boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  bootstrapped: false,
  isSignedIn: false,

  bootstrap: async () => {
    if (!supabase) {
      set({ loading: false, bootstrapped: true, user: null, session: null, isSignedIn: false });
      return;
    }

    // Web magic-link: exchange tokens from URL hash/query
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const href = window.location.href;
      if (href.includes('access_token') || href.includes('type=magiclink') || href.includes('code=')) {
        try {
          await supabase.auth.exchangeCodeForSession(href).catch(async () => {
            // Older hash-based links
            const hash = window.location.hash?.replace(/^#/, '') ?? '';
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase!.auth.setSession({ access_token, refresh_token });
            }
          });
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          /* continue with getSession */
        }
      }
    }

    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      isSignedIn: Boolean(data.session?.user),
      loading: false,
      bootstrapped: true,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isSignedIn: Boolean(session?.user),
        loading: false,
      });
    });
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, session: null, isSignedIn: false });
  },
}));

export { isSupabaseConfigured };
