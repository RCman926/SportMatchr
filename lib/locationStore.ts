import { create } from 'zustand';
import {
  coarsenCoords,
  getUserLocation,
  LatLng,
  DEFAULT_OTTAWA_CENTER,
  AREA_PRESETS,
  FALLBACK_START_LABEL,
  writeManualArea,
} from './location';

type RefreshResult = { ok: boolean; errorHint: string | null };

type LocationStore = {
  coords: LatLng;
  area: string;
  source: 'gps' | 'manual' | 'fallback';
  permission: 'granted' | 'denied' | 'undetermined';
  loading: boolean;
  sharePresence: boolean;
  needsLocation: boolean;
  errorHint: string | null;
  refresh: (opts?: { forcePrompt?: boolean }) => Promise<RefreshResult>;
  setManualArea: (presetId: string) => void;
  setCustomArea: (label: string, coords: LatLng) => void;
  setSharePresence: (v: boolean) => void;
  presenceCoords: () => LatLng;
};

export const useLocationStore = create<LocationStore>((set, get) => ({
  coords: DEFAULT_OTTAWA_CENTER,
  area: FALLBACK_START_LABEL,
  source: 'fallback',
  permission: 'undetermined',
  loading: false,
  sharePresence: true,
  needsLocation: true,
  errorHint: null,
  setSharePresence: (v) => set({ sharePresence: v }),
  presenceCoords: () => coarsenCoords(get().coords),
  setManualArea: (presetId) => {
    const preset = AREA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    writeManualArea({
      label: preset.label,
      coords: preset.coords,
      presetId: preset.id,
    });
    set({
      coords: preset.coords,
      area: preset.label,
      source: 'manual',
      permission: 'granted',
      loading: false,
      needsLocation: false,
      errorHint: null,
    });
  },
  setCustomArea: (label, coords) => {
    const clean = label.trim();
    if (!clean) return;
    writeManualArea({ label: clean, coords });
    set({
      coords,
      area: clean,
      source: 'manual',
      permission: 'granted',
      loading: false,
      needsLocation: false,
      errorHint: null,
    });
  },
  refresh: async (opts) => {
    set({ loading: true, errorHint: null });
    try {
      const result = await getUserLocation({ forcePrompt: opts?.forcePrompt });
      const ok = result.source === 'gps' || result.source === 'manual';
      const errorHint = result.errorHint ?? null;
      set({
        coords: result.coords,
        area: result.area,
        source: result.source,
        permission: result.permission,
        loading: false,
        needsLocation: !ok,
        errorHint,
      });
      return { ok, errorHint };
    } catch {
      const errorHint =
        'Couldn’t get GPS. Pick your neighbourhood. The board is showing a central Ottawa starting point until you do.';
      set({
        coords: DEFAULT_OTTAWA_CENTER,
        area: FALLBACK_START_LABEL,
        loading: false,
        needsLocation: true,
        source: 'fallback',
        errorHint,
      });
      return { ok: false, errorHint };
    }
  },
}));
