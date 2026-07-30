import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const STORAGE_KEY = 'sportmatchr_presence_client_id';

function randomId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function readStoredId(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY);
  }
  return AsyncStorage.getItem(STORAGE_KEY);
}

async function writeStoredId(id: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

/** Opaque browser/device id so guests count as online too. */
export async function getPresenceClientId(): Promise<string> {
  const existing = await readStoredId();
  if (existing && existing.length >= 8) return existing;
  const id = randomId();
  await writeStoredId(id);
  return id;
}

/** Heartbeat: “I’m in the app right now” (not the same as looking for a game). */
export async function touchPresence(userId?: string | null): Promise<void> {
  if (!supabase) return;
  const clientId = await getPresenceClientId();
  await supabase.rpc('touch_presence', {
    p_client_id: clientId,
    p_user_id: userId ?? null,
  });
}
