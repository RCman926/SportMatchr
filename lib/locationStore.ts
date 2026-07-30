import { create } from 'zustand';
import {
  coarsenCoords,
  getUserLocation,
  LatLng,
  areaLabel,
  DEFAULT_OTTAWA_CENTER,
} from './location';

type LocationStore = {
  coords: LatLng;
  area: string;
  source: 'gps' | 'fallback';
  permission: 'granted' | 'denied' | 'undetermined';
  loading: boolean;
  sharePresence: boolean;
  refresh: () => Promise<void>;
  setSharePresence: (v: boolean) => void;
  /** Coarsened coords safe to attach to Go Live / Solos */
  presenceCoords: () => LatLng;
};

export const useLocationStore = create<LocationStore>((set, get) => ({
  coords: DEFAULT_OTTAWA_CENTER,
  area: areaLabel(DEFAULT_OTTAWA_CENTER),
  source: 'fallback',
  permission: 'undetermined',
  loading: true,
  sharePresence: true,
  setSharePresence: (v) => set({ sharePresence: v }),
  presenceCoords: () => coarsenCoords(get().coords),
  refresh: async () => {
    set({ loading: true });
    const result = await getUserLocation();
    set({
      coords: result.coords,
      area: result.area,
      source: result.source,
      permission: result.permission,
      loading: false,
    });
  },
}));
