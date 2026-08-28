import { create } from 'zustand';
import { DEFAULT_GENDER_IDENTITY } from '../constants/booking';

/**
 * Lightweight source of truth for the current user's self-reported gender, shared
 * across screens (profile edit sets it; the session join gate reads it). For
 * signed-in users it's hydrated from / written to the profile; for guests it stays
 * local to the session so the women-only gate is still demonstrable.
 */
type ProfileState = {
  gender: string;
  setGender: (gender: string) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  gender: DEFAULT_GENDER_IDENTITY,
  setGender: (gender) => set({ gender }),
}));
