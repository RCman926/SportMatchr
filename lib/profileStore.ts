import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DEFAULT_GENDER_IDENTITY } from '../constants/booking';

/**
 * Source of truth for the current user's self-reported gender, shared across
 * screens (profile edit sets it; the women-only join gate reads it).
 *
 * Persisted so it survives reloads/cold starts — otherwise a woman opening a
 * women-only game directly (without first visiting her profile) would be wrongly
 * blocked. For signed-in users it's re-hydrated from the profile on startup.
 */
type ProfileState = {
  gender: string;
  setGender: (gender: string) => void;
};

const webStorage: StateStorage = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : (AsyncStorage as unknown as StateStorage);

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      gender: DEFAULT_GENDER_IDENTITY,
      setGender: (gender) => set({ gender }),
    }),
    {
      name: 'sportmatchr-profile',
      storage: createJSONStorage(() => storage),
    }
  )
);
