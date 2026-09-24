import { OTTAWA_COURTS, OttawaCourt } from '../constants/ottawaCourts';
import {
  OTTAWA_SPORTS,
  OttawaSport,
  currentOttawaSeason,
  isIceSport,
  EVENT_ONLY_SPORTS,
  mapSportsOnly,
  toMapSport,
} from '../constants/sports';
import { haversineKm } from './location';

export type PlaceWithDistance = OttawaCourt & { distanceKm: number };

const CATALOG = new Set<string>(OTTAWA_SPORTS);
const EVENT_ONLY = new Set<string>(EVENT_ONLY_SPORTS);

/** Sports that belong on a map pin (a court, field, basket, launch — not a lawn meetup). */
export function catalogSportsOnly(sports: string[]): string[] {
  return sports.filter((s) => CATALOG.has(s) && !EVENT_ONLY.has(s));
}

export function isCatalogSport(sport: string | null | undefined): sport is OttawaSport {
  return Boolean(sport && CATALOG.has(sport));
}

/** True for map chips (Hockey, Football, …) and catalog names that alias onto them. */
export function isMapPlaceSport(sport: string | null | undefined): boolean {
  return toMapSport(sport) != null;
}

export function catalogSportForHost(
  placeSports: string[],
  mapFilter: string | null
): string {
  const raw = catalogSportsOnly(placeSports);
  if (mapFilter && raw.includes(mapFilter)) return mapFilter;
  const mapped = toMapSport(mapFilter);
  if (mapped) {
    const hit = raw.find((s) => toMapSport(s) === mapped);
    if (hit) return hit;
  }
  return raw[0] ?? '';
}

function withCatalogSports(place: OttawaCourt): OttawaCourt | null {
  const sports = catalogSportsOnly(place.sports);
  if (!sports.length) return null;
  return { ...place, sports };
}

function hasMapSport(place: OttawaCourt, sport?: string | null): boolean {
  const mapped = mapSportsOnly(place.sports);
  if (!mapped.length) return false;
  const want = toMapSport(sport ?? null);
  if (!want) return true;
  return mapped.includes(want);
}

/**
 * Free outdoor places only, optionally filtered by sport and season.
 * If a sport is selected, calendar season filter is skipped so e.g. Shinny
 * in July still shows rinks.
 */
export function listFreePlaces(opts?: {
  sport?: string | null;
  seasonAware?: boolean;
}): OttawaCourt[] {
  const season = currentOttawaSeason();
  let list = OTTAWA_COURTS.filter((c) => c.type === 'free')
    .map(withCatalogSports)
    .filter((c): c is OttawaCourt => c !== null);

  if (opts?.sport) {
    const want = toMapSport(opts.sport);
    list = want
      ? list.filter((c) => hasMapSport(c, want))
      : list.filter((c) => c.sports.includes(opts.sport!));
  }

  const skipSeasonClip = Boolean(opts?.sport) || isIceSport(opts?.sport);
  if (opts?.seasonAware && !skipSeasonClip) {
    list = list.filter((c) => {
      if (c.season === 'multi' || c.season === 'year-round') return true;
      if (season === 'Winter') return c.season === 'winter';
      if (season === 'Summer') return c.season === 'summer';
      return true;
    });
  }

  return list;
}

/** Parks with a real facility people look for — not kickball-on-any-lawn. */
export function listMapPlaces(opts?: { sport?: string | null }): OttawaCourt[] {
  const want = toMapSport(opts?.sport ?? null);
  return OTTAWA_COURTS.filter((c) => c.type === 'free').filter((c) =>
    hasMapSport(c, want)
  );
}

/**
 * Places to host a game: if the activity maps to a facility (Flag Football →
 * football fields, Outdoor Fitness → outdoor gyms), use those. Spikeball /
 * yoga / etc. pick any mapped park nearby.
 */
export function listHostPlaces(opts?: {
  sport?: string | null;
  seasonAware?: boolean;
}): OttawaCourt[] {
  const mapped = toMapSport(opts?.sport ?? null);
  if (mapped) return listFreePlaces({ sport: mapped, seasonAware: opts?.seasonAware });
  if (opts?.sport) {
    const tagged = listFreePlaces({ sport: opts.sport, seasonAware: opts?.seasonAware });
    if (tagged.length) return tagged;
  }
  return listMapPlaces();
}

export function freePlacesNearYou(
  coords: { lat: number; lng: number },
  opts?: {
    sport?: string | null;
    limit?: number;
    seasonAware?: boolean;
    /** Soft boost for well-rated places among nearby results */
    ratingById?: Record<string, { avgStars: number; ratingCount: number }>;
  }
): PlaceWithDistance[] {
  const limit = opts?.limit ?? 8;
  const ratings = opts?.ratingById ?? {};
  return listHostPlaces({ sport: opts?.sport, seasonAware: opts?.seasonAware })
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(coords, { lat: c.lat, lng: c.lng }),
    }))
    .sort((a, b) => {
      const ra = ratings[a.id];
      const rb = ratings[b.id];
      const popularA = ra && ra.ratingCount >= 2 && ra.avgStars >= 4 ? 1 : 0;
      const popularB = rb && rb.ratingCount >= 2 && rb.avgStars >= 4 ? 1 : 0;
      if (popularA !== popularB) return popularB - popularA;
      const boostA = ra && ra.ratingCount > 0 ? ra.avgStars * 0.35 : 0;
      const boostB = rb && rb.ratingCount > 0 ? rb.avgStars * 0.35 : 0;
      return a.distanceKm - boostA - (b.distanceKm - boostB);
    })
    .slice(0, limit);
}

/** Catalog sports with no outdoor free place yet — empty is not required. */
export function sportsMissingFreePlace(): OttawaSport[] {
  const free = listMapPlaces();
  return OTTAWA_SPORTS.filter((s) => {
    if (EVENT_ONLY.has(s)) return false;
    const mapped = toMapSport(s);
    if (mapped) return !free.some((c) => mapSportsOnly(c.sports).includes(mapped));
    return false;
  });
}

export { mapSportsOnly, toMapSport };
