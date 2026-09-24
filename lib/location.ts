import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { OTTAWA_COURTS } from '../constants/ottawaCourts';

export type LatLng = { lat: number; lng: number };

const LAST_GPS_KEY = 'sportmatchr.lastGps';
const MANUAL_AREA_KEY = 'sportmatchr.manualArea';

/** Default when permission denied — Lansdowne / Glebe pocket centroid */
export const DEFAULT_OTTAWA_CENTER: LatLng = {
  lat: 45.3989,
  lng: -75.6836,
};

/** Manual area picks when desktop GPS fails (common on Windows). */
export const AREA_PRESETS: { id: string; label: string; coords: LatLng }[] = [
  { id: 'kanata', label: 'Kanata', coords: { lat: 45.318, lng: -75.905 } },
  { id: 'barrhaven', label: 'Barrhaven', coords: { lat: 45.275, lng: -75.745 } },
  { id: 'stittsville', label: 'Stittsville', coords: { lat: 45.26, lng: -75.92 } },
  { id: 'nepean', label: 'Nepean', coords: { lat: 45.35, lng: -75.76 } },
  { id: 'orleans', label: 'Orléans', coords: { lat: 45.47, lng: -75.52 } },
  { id: 'glebe', label: 'Glebe', coords: DEFAULT_OTTAWA_CENTER },
  { id: 'centretown', label: 'Centretown', coords: { lat: 45.415, lng: -75.695 } },
];

export type ManualArea = {
  label: string;
  coords: LatLng;
  /** Preset id when chosen from AREA_PRESETS shortcuts */
  presetId?: string;
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 0.1) return '<0.1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Coarsen coords ~150m for privacy when sharing presence (not exact pin). */
export function coarsenCoords(coords: LatLng, decimals = 3): LatLng {
  const f = 10 ** decimals;
  return {
    lat: Math.round(coords.lat * f) / f,
    lng: Math.round(coords.lng * f) / f,
  };
}

export function courtCoords(courtId?: string | null): LatLng | null {
  if (!courtId) return null;
  const c = OTTAWA_COURTS.find((x) => x.id === courtId);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

export function nearestCourt(coords: LatLng) {
  let best = OTTAWA_COURTS[0];
  let bestKm = Infinity;
  for (const c of OTTAWA_COURTS) {
    const km = haversineKm(coords, { lat: c.lat, lng: c.lng });
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return { court: best, distanceKm: bestKm };
}

export function areaLabel(coords: LatLng): string {
  const { court, distanceKm } = nearestCourt(coords);
  if (distanceKm < 2.5) return court.neighbourhood;
  return `${court.neighbourhood} area`;
}

function readCachedGps(): LatLng | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_GPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; at?: number };
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng)
    ) {
      return null;
    }
    if (parsed.at && Date.now() - parsed.at > 7 * 24 * 60 * 60 * 1000) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function writeCachedGps(coords: LatLng) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      LAST_GPS_KEY,
      JSON.stringify({ lat: coords.lat, lng: coords.lng, at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function readManualArea(): ManualArea | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MANUAL_AREA_KEY);
    if (!raw) return null;
    // Legacy: plain preset id string
    if (!raw.startsWith('{')) {
      const preset = AREA_PRESETS.find((p) => p.id === raw);
      return preset
        ? { label: preset.label, coords: preset.coords, presetId: preset.id }
        : null;
    }
    const parsed = JSON.parse(raw) as ManualArea;
    if (
      typeof parsed.label !== 'string' ||
      typeof parsed.coords?.lat !== 'number' ||
      typeof parsed.coords?.lng !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** @deprecated use readManualArea */
export function readManualAreaId(): string | null {
  return readManualArea()?.presetId ?? null;
}

export function writeManualArea(area: ManualArea | null) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    if (!area) localStorage.removeItem(MANUAL_AREA_KEY);
    else localStorage.setItem(MANUAL_AREA_KEY, JSON.stringify(area));
  } catch {
    /* ignore */
  }
}

/** @deprecated use writeManualArea */
export function writeManualAreaId(id: string | null) {
  if (!id) {
    writeManualArea(null);
    return;
  }
  const preset = AREA_PRESETS.find((p) => p.id === id);
  if (preset) {
    writeManualArea({
      label: preset.label,
      coords: preset.coords,
      presetId: preset.id,
    });
  }
}

type BrowserFix = {
  coords: LatLng | null;
  errorCode?: number;
  errorMessage?: string;
};

async function readBrowserPosition(opts?: {
  highAccuracy?: boolean;
  timeoutMs?: number;
}): Promise<BrowserFix> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { coords: null, errorMessage: 'This browser has no geolocation.' };
  }
  const highAccuracy = opts?.highAccuracy ?? false;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  // Windows/Chrome sometimes never fires success OR error — race our own timeout.
  const hardTimeoutMs = timeoutMs + 1500;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: BrowserFix) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      finish({
        coords: null,
        errorCode: 3,
        errorMessage: 'Location timed out',
      });
    }, hardTimeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          finish({
            coords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
          });
        },
        (err) => {
          clearTimeout(timer);
          finish({
            coords: null,
            errorCode: err?.code,
            errorMessage: err?.message || 'Location failed',
          });
        },
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 60_000 }
      );
    } catch (e) {
      clearTimeout(timer);
      finish({
        coords: null,
        errorMessage: e instanceof Error ? e.message : 'Location failed',
      });
    }
  });
}

function explainGeoError(code?: number, message?: string): string {
  // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
  if (code === 1) {
    return 'Location is blocked for this site. Click the lock icon in the address bar → Location → Allow, then try again.';
  }
  if (code === 2) {
    return 'Browser allowed the site, but Windows couldn’t get a fix. Turn on Settings → Privacy & security → Location, then try again — or pick your area below.';
  }
  if (code === 3) {
    return 'Location timed out. Try again, or pick your area below (Kanata, Barrhaven…).';
  }
  return message || 'Couldn’t get GPS. Pick your area below.';
}

export type UserLocationResult = {
  coords: LatLng;
  source: 'gps' | 'manual' | 'fallback';
  area: string;
  permission: 'granted' | 'denied' | 'undetermined';
  fromCache?: boolean;
  errorHint?: string;
};

/**
 * Resolve user location. On web, browsers often block GPS until a user tap —
 * call this from a button as well as on boot.
 */
export async function getUserLocation(opts?: {
  forcePrompt?: boolean;
}): Promise<UserLocationResult> {
  const forcePrompt = Boolean(opts?.forcePrompt);

  try {
    if (Platform.OS === 'web') {
      // Manual area wins until GPS succeeds (desktop escape hatch)
      if (!forcePrompt) {
        const manual = readManualArea();
        if (manual) {
          return {
            coords: manual.coords,
            source: 'manual',
            area: manual.label,
            permission: 'granted',
          };
        }
      }

      let fix = await readBrowserPosition({ highAccuracy: false, timeoutMs: 10_000 });
      if (!fix.coords) {
        fix = await readBrowserPosition({ highAccuracy: true, timeoutMs: 18_000 });
      }

      if (fix.coords) {
        writeCachedGps(fix.coords);
        writeManualArea(null);
        return {
          coords: fix.coords,
          source: 'gps',
          area: areaLabel(fix.coords),
          permission: 'granted',
        };
      }

      const hint = explainGeoError(fix.errorCode, fix.errorMessage);

      if (!forcePrompt) {
        const cached = readCachedGps();
        if (cached) {
          return {
            coords: cached,
            source: 'gps',
            area: areaLabel(cached),
            permission: 'granted',
            fromCache: true,
            errorHint: hint,
          };
        }
        const manual = readManualArea();
        if (manual) {
          return {
            coords: manual.coords,
            source: 'manual',
            area: manual.label,
            permission: 'granted',
            errorHint: hint,
          };
        }
      }

      return {
        coords: DEFAULT_OTTAWA_CENTER,
        source: 'fallback',
        area: areaLabel(DEFAULT_OTTAWA_CENTER),
        permission: fix.errorCode === 1 ? 'denied' : 'undetermined',
        errorHint: hint,
      };
    }

    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const asked = await Location.requestForegroundPermissionsAsync();
      status = asked.status;
    }

    if (status !== 'granted') {
      return {
        coords: DEFAULT_OTTAWA_CENTER,
        source: 'fallback',
        area: areaLabel(DEFAULT_OTTAWA_CENTER),
        permission: 'denied',
        errorHint: 'Location permission denied. Enable it in system settings, or pick an area.',
      };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    return {
      coords,
      source: 'gps',
      area: areaLabel(coords),
      permission: 'granted',
    };
  } catch {
    const cached = readCachedGps();
    if (cached) {
      return {
        coords: cached,
        source: 'gps',
        area: areaLabel(cached),
        permission: 'granted',
        fromCache: true,
      };
    }
    return {
      coords: DEFAULT_OTTAWA_CENTER,
      source: 'fallback',
      area: areaLabel(DEFAULT_OTTAWA_CENTER),
      permission: 'denied',
      errorHint: 'Couldn’t get GPS. Pick your area below.',
    };
  }
}
