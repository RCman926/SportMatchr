import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { OTTAWA_COURTS } from '../constants/ottawaCourts';

export type LatLng = { lat: number; lng: number };

/** Default when permission denied — Lansdowne / Glebe pocket centroid */
export const DEFAULT_OTTAWA_CENTER: LatLng = {
  lat: 45.3989,
  lng: -75.6836,
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
  if (distanceKm < 1.5) return court.neighbourhood;
  return `${court.neighbourhood} area`;
}

async function readBrowserPosition(): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

export type UserLocationResult = {
  coords: LatLng;
  source: 'gps' | 'fallback';
  area: string;
  permission: 'granted' | 'denied' | 'undetermined';
};

export async function getUserLocation(): Promise<UserLocationResult> {
  try {
    if (Platform.OS === 'web') {
      const browser = await readBrowserPosition();
      if (browser) {
        return {
          coords: browser,
          source: 'gps',
          area: areaLabel(browser),
          permission: 'granted',
        };
      }
      return {
        coords: DEFAULT_OTTAWA_CENTER,
        source: 'fallback',
        area: areaLabel(DEFAULT_OTTAWA_CENTER),
        permission: 'denied',
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
    return {
      coords: DEFAULT_OTTAWA_CENTER,
      source: 'fallback',
      area: areaLabel(DEFAULT_OTTAWA_CENTER),
      permission: 'denied',
    };
  }
}
