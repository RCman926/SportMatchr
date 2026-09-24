import { OTTAWA_SPORTS } from '../constants/sports';
import type { MapSport } from '../constants/sports';
import { toMapSport } from '../constants/sports';

const MAP_SPORT_COLORS: Record<MapSport, string> = {
  Hockey: '#2B5F8A',
  Skating: '#4A8FA8',
  Football: '#8B5A2B',
  Tennis: '#1B6B32',
  'Disc Golf': '#C45C26',
  Basketball: '#C75A28',
  Soccer: '#3D7A3C',
  Volleyball: '#C9A227',
  'Beach Volleyball': '#1A7A86',
  'Outdoor Fitness': '#8A3D38',
};

/** Distinct pin colour per catalog sport — not family (court/field/ice). */
export function sportPinColor(name: string | null | undefined): string {
  const sport = (name ?? '').trim();
  if (!sport) return '#1B6B32';
  const mapped = toMapSport(sport);
  if (mapped) return MAP_SPORT_COLORS[mapped];
  const idx = OTTAWA_SPORTS.indexOf(sport as (typeof OTTAWA_SPORTS)[number]);
  const n = idx >= 0 ? idx : hashName(sport);
  const hue = (n * 137.508) % 360;
  const sat = 58 + (n % 6) * 5;
  const lit = 36 + (n % 5) * 4;
  return `hsl(${hue.toFixed(1)} ${sat}% ${lit}%)`;
}

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}
