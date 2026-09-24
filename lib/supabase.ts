import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// SportMatchr project (anon key is public by design). Env / app.config override these.
const DEFAULT_URL = 'https://hknklqxaiqqgxdnklpws.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbmtscXhhaXFxZ3hkbmtscHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNzI1ODYsImV4cCI6MjEwMDg0ODU4Nn0.seoPp2Sz_8fDA8RVVrBirdMMa3YfhgGmTUYuAi5bugk';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.supabaseUrl ||
  DEFAULT_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabaseAnonKey ||
  DEFAULT_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  supabaseAnonKey !== 'YOUR_ANON_KEY';

const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve(null);
          return Promise.resolve(localStorage.getItem(key));
        },
        setItem: (key: string, value: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve();
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve();
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : AsyncStorage;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;
