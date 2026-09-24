import { OTTAWA_COURTS } from '../constants/ottawaCourts';
import { AREA_PRESETS, LatLng } from './location';

export type AreaChoice = {
  id: string;
  label: string;
  coords: LatLng;
  source: 'local' | 'geo';
};

/** Rough Ottawa–Gatineau catch basin for typed search. */
const OTTAWA_BBOX = {
  minLat: 44.85,
  maxLat: 45.75,
  minLng: -76.55,
  maxLng: -74.95,
};

function inOttawaBasin(lat: number, lng: number): boolean {
  return (
    lat >= OTTAWA_BBOX.minLat &&
    lat <= OTTAWA_BBOX.maxLat &&
    lng >= OTTAWA_BBOX.minLng &&
    lng <= OTTAWA_BBOX.maxLng
  );
}

function buildLocalAreas(): AreaChoice[] {
  const byLabel = new Map<string, { lat: number; lng: number; n: number }>();

  for (const c of OTTAWA_COURTS) {
    const key = c.neighbourhood.trim();
    if (!key) continue;
    const cur = byLabel.get(key) ?? { lat: 0, lng: 0, n: 0 };
    cur.lat += c.lat;
    cur.lng += c.lng;
    cur.n += 1;
    byLabel.set(key, cur);
  }

  for (const p of AREA_PRESETS) {
    if (!byLabel.has(p.label)) {
      byLabel.set(p.label, { lat: p.coords.lat, lng: p.coords.lng, n: 1 });
    }
  }

  // Common suburbs / pockets people type that may not be court neighbourhood labels
  const extras: { label: string; coords: LatLng }[] = [
    { label: 'Kanata Lakes', coords: { lat: 45.34, lng: -75.91 } },
    { label: 'Kanata North', coords: { lat: 45.35, lng: -75.91 } },
    { label: 'Katimavik', coords: { lat: 45.32, lng: -75.89 } },
    { label: 'Bridlewood', coords: { lat: 45.29, lng: -75.88 } },
    { label: 'Glen Cairn', coords: { lat: 45.3, lng: -75.89 } },
    { label: 'Riverside South', coords: { lat: 45.27, lng: -75.68 } },
    { label: 'Barrhaven West', coords: { lat: 45.27, lng: -75.76 } },
    { label: 'Half Moon Bay', coords: { lat: 45.26, lng: -75.76 } },
    { label: 'Chapman Mills', coords: { lat: 45.27, lng: -75.74 } },
    { label: 'Avalon', coords: { lat: 45.45, lng: -75.48 } },
    { label: 'Fallingbrook', coords: { lat: 45.47, lng: -75.49 } },
    { label: 'Orléans South', coords: { lat: 45.45, lng: -75.52 } },
    { label: 'Beacon Hill', coords: { lat: 45.45, lng: -75.6 } },
    { label: 'Alta Vista', coords: { lat: 45.38, lng: -75.65 } },
    { label: 'Billings Bridge', coords: { lat: 45.38, lng: -75.67 } },
    { label: 'Glebe', coords: { lat: 45.3989, lng: -75.6836 } },
    { label: 'Little Italy', coords: { lat: 45.41, lng: -75.71 } },
    { label: 'Chinatown', coords: { lat: 45.41, lng: -75.71 } },
    { label: 'The Glebe', coords: { lat: 45.3989, lng: -75.6836 } },
    { label: 'Carleton Heights', coords: { lat: 45.37, lng: -75.71 } },
    { label: 'Bayshore', coords: { lat: 45.35, lng: -75.81 } },
    { label: 'Bells Corners', coords: { lat: 45.32, lng: -75.83 } },
    { label: 'Crystal Beach', coords: { lat: 45.35, lng: -75.83 } },
    { label: 'Hunt Club Park', coords: { lat: 45.35, lng: -75.64 } },
    { label: 'Greely', coords: { lat: 45.25, lng: -75.58 } },
    { label: 'Vars', coords: { lat: 45.35, lng: -75.35 } },
    { label: 'Munster', coords: { lat: 45.2, lng: -75.85 } },
    { label: 'Almonte', coords: { lat: 45.226, lng: -76.195 } },
    { label: 'Carleton Place', coords: { lat: 45.14, lng: -76.145 } },
    { label: 'Kemptville', coords: { lat: 45.02, lng: -75.64 } },
    { label: 'Mississippi Mills', coords: { lat: 45.226, lng: -76.195 } },
    { label: 'North Grenville', coords: { lat: 45.02, lng: -75.64 } },
    { label: 'Pakenham', coords: { lat: 45.336, lng: -76.292 } },
    { label: 'Appleton', coords: { lat: 45.182, lng: -76.118 } },
    { label: 'Ashton', coords: { lat: 45.155, lng: -76.032 } },
    { label: 'Smiths Falls', coords: { lat: 44.904, lng: -76.022 } },
    { label: 'Perth', coords: { lat: 44.9, lng: -76.249 } },
    { label: 'North Gower', coords: { lat: 45.131, lng: -75.716 } },
    { label: 'Kars', coords: { lat: 45.148, lng: -75.648 } },
    { label: 'Merrickville', coords: { lat: 44.916, lng: -75.838 } },
    { label: 'Rockland', coords: { lat: 45.55, lng: -75.29 } },
    { label: 'Casselman', coords: { lat: 45.313, lng: -75.087 } },
    { label: 'Limoges', coords: { lat: 45.335, lng: -75.255 } },
    { label: 'Dunrobin', coords: { lat: 45.45, lng: -76.005 } },
    { label: "Shirley's Bay", coords: { lat: 45.365, lng: -75.883 } },
    { label: "Pinhey's Point", coords: { lat: 45.507, lng: -76.082 } },
    { label: 'Ottawa', coords: { lat: 45.4215, lng: -75.6972 } },
  ];

  for (const e of extras) {
    if (!byLabel.has(e.label)) {
      byLabel.set(e.label, { lat: e.coords.lat, lng: e.coords.lng, n: 1 });
    }
  }

  return [...byLabel.entries()]
    .map(([label, v]) => ({
      id: `local:${label.toLowerCase()}`,
      label,
      coords: { lat: v.lat / v.n, lng: v.lng / v.n },
      source: 'local' as const,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const LOCAL_OTTAWA_AREAS: AreaChoice[] = buildLocalAreas();

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, "'");
}

/** Instant local suggestions while typing. */
export function suggestLocalAreas(query: string, limit = 8): AreaChoice[] {
  const q = normalize(query);
  if (q.length < 1) return [];

  const scored = LOCAL_OTTAWA_AREAS.map((a) => {
    const n = normalize(a.label);
    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q)) score = 80;
    else if (n.includes(q)) score = 50;
    else if (q.split(/\s+/).every((w) => n.includes(w))) score = 40;
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.a.label.localeCompare(y.a.label));

  return scored.slice(0, limit).map((x) => x.a);
}

async function geocodeOttawaQuery(query: string): Promise<AreaChoice[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const url =
      'https://geocoding-api.open-meteo.com/v1/search?' +
      new URLSearchParams({
        name: q,
        count: '10',
        language: 'en',
        format: 'json',
        countryCode: 'CA',
      }).toString();

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        name: string;
        latitude: number;
        longitude: number;
        admin1?: string;
        admin2?: string;
      }[];
    };

    const out: AreaChoice[] = [];
    for (const r of data.results ?? []) {
      if (!inOttawaBasin(r.latitude, r.longitude)) continue;
      const admin = [r.admin2, r.admin1].filter(Boolean).join(', ');
      const label = admin && !normalize(admin).includes(normalize(r.name))
        ? `${r.name}`
        : r.name;
      out.push({
        id: `geo:${r.name}:${r.latitude}:${r.longitude}`,
        label,
        coords: { lat: r.latitude, lng: r.longitude },
        source: 'geo',
      });
    }
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

/**
 * Resolve a typed area: prefer exact/local match, then Ottawa-basin geocode.
 */
export async function resolveAreaQuery(query: string): Promise<{
  choice: AreaChoice | null;
  suggestions: AreaChoice[];
  error?: string;
}> {
  const q = query.trim();
  if (q.length < 2) {
    return { choice: null, suggestions: [], error: 'Type at least 2 characters.' };
  }

  const local = suggestLocalAreas(q, 8);
  const exact = local.find((a) => normalize(a.label) === normalize(q));
  if (exact) return { choice: exact, suggestions: local };

  const starts = local.find((a) => normalize(a.label).startsWith(normalize(q)));
  if (starts && q.length >= 4) {
    // Strong prefix match (e.g. "Kanata") — use it
    return { choice: starts, suggestions: local };
  }

  const geo = await geocodeOttawaQuery(q);
  const merged = [...local];
  for (const g of geo) {
    if (!merged.some((m) => normalize(m.label) === normalize(g.label))) {
      merged.push(g);
    }
  }

  if (geo[0]) {
    return { choice: geo[0], suggestions: merged.slice(0, 8) };
  }
  if (local[0]) {
    return { choice: local[0], suggestions: local };
  }

  return {
    choice: null,
    suggestions: [],
    error: 'No match in Ottawa area. Try Kanata, Barrhaven, Westboro…',
  };
}
